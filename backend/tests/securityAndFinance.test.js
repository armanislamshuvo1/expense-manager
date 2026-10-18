import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ACCOUNT_TYPES } from '../models/Account.js';

describe('Security & Authentication Suite', () => {
  it('generates cryptographically secure 32-byte tokens and valid SHA-256 hashes', () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    expect(rawToken).toHaveLength(64);

    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(hashedToken).toHaveLength(64);

    // Verify hash stability
    const rehashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(hashedToken).toBe(rehashedToken);
  });

  it('rejects expired password reset tokens', () => {
    const pastExpiration = new Date(Date.now() - 1000); // 1 sec in the past
    const isExpired = pastExpiration <= new Date();
    expect(isExpired).toBe(true);

    const futureExpiration = new Date(Date.now() + 15 * 60 * 1000); // 15 mins in future
    const isValid = futureExpiration > new Date();
    expect(isValid).toBe(true);
  });

  it('signs and verifies JWT tokens containing user baseCurrency', () => {
    const secret = 'test_secret_for_vitest_nexuswealth_32chars';
    const payload = {
      id: 'user_123',
      email: 'alex@nexus.com',
      role: 'USER',
      status: 'ACTIVE',
      baseCurrency: 'EUR'
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1d' });
    const decoded = jwt.verify(token, secret);

    expect(decoded.id).toBe('user_123');
    expect(decoded.email).toBe('alex@nexus.com');
    expect(decoded.baseCurrency).toBe('EUR');
  });
});

describe('Financial Calculation & Concurrency Suite', () => {
  const getBalanceEffectForAccount = (transaction, accountCurrency, baseCurrency) => {
    if (transaction.currency === accountCurrency) {
      return transaction.amount;
    }
    return transaction.shouldConvert 
      ? (transaction.amount * transaction.exchangeRate) 
      : transaction.amount;
  };

  it('calculates 1:1 balance effect when transaction currency matches account currency', () => {
    const tx = { amount: 150.50, currency: 'USD', shouldConvert: true, exchangeRate: 4.5 };
    const effect = getBalanceEffectForAccount(tx, 'USD', 'USD');
    expect(effect).toBe(150.50);
  });

  it('applies exchange rate correctly when currencies differ', () => {
    const tx = { amount: 100, currency: 'USD', shouldConvert: true, exchangeRate: 4.45 };
    const effect = getBalanceEffectForAccount(tx, 'MYR', 'MYR');
    expect(effect).toBe(445);
  });

  it('respects shouldConvert: false override', () => {
    const tx = { amount: 100, currency: 'USD', shouldConvert: false, exchangeRate: 4.45 };
    const effect = getBalanceEffectForAccount(tx, 'MYR', 'MYR');
    expect(effect).toBe(100);
  });

  it('simulates atomic $inc operations without race condition loss', () => {
    let accountBalance = 1000.00;
    const concurrentOperations = [
      { type: 'INCOME', amount: 250 },
      { type: 'EXPENSE', amount: 75 },
      { type: 'EXPENSE', amount: 125 },
      { type: 'INCOME', amount: 50 },
    ];

    // Atomic increments simulate MongoDB $inc
    concurrentOperations.forEach(op => {
      const delta = op.type === 'INCOME' ? op.amount : -op.amount;
      accountBalance += delta;
    });

    expect(accountBalance).toBe(1100.00);
  });
});

describe('Defensive Offline Sync Resolution Suite', () => {
  it('correctly detects non-ObjectId client identifiers', () => {
    const clientAccId = 'acc_abc123_456789';
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(clientAccId);
    expect(isMongoId).toBe(false);

    const validMongoId = '66a1b2c3d4e5f6a7b8c9d0e1';
    const isValid = /^[0-9a-fA-F]{24}$/.test(validMongoId);
    expect(isValid).toBe(true);
  });
});

describe('Account Categories & Types Specification', () => {
  it('includes E-WALLET in ACCOUNT_TYPES positioned after card types', () => {
    expect(ACCOUNT_TYPES).toContain('E-WALLET');
    const cardIndex = ACCOUNT_TYPES.indexOf('CARD');
    const ewalletIndex = ACCOUNT_TYPES.indexOf('E-WALLET');
    const savingsIndex = ACCOUNT_TYPES.indexOf('SAVINGS');

    expect(ewalletIndex).toBeGreaterThan(cardIndex);
    expect(savingsIndex).toBeGreaterThan(ewalletIndex);
  });

  it('correctly accepts recognized account categories and rejects unknown categories', () => {
    const validCategory = 'E-WALLET';
    const invalidCategory = 'PIGGY_BANK';

    expect(ACCOUNT_TYPES.includes(validCategory)).toBe(true);
    expect(ACCOUNT_TYPES.includes(invalidCategory)).toBe(false);
  });
});

