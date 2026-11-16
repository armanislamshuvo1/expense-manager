import { describe, it, expect, beforeEach } from '../harness/testHelper.js';
import { TransferSimulationEngine } from '../harness/engine.js';

describe('Tier 2: Boundary & Corner Cases Suite', () => {
  let engine;

  beforeEach(() => {
    engine = new TransferSimulationEngine({ userId: 'tier2_user', baseCurrency: 'MYR' });
  });

  // =========================================================================
  // Category 1: Zero & Negative Amount Validations
  // =========================================================================
  describe('Boundary 1: Zero and Negative Transfer Amounts', () => {
    it('rejects transfer with amount equal to 0', () => {
      const s = engine.createAccount({ id: 'b1_s', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'b1_d', currency: 'MYR', balance: 100 });

      expect(() => {
        engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 0 });
      }).toThrow(/Transfer amount must be a positive number/);

      expect(engine.getAccount(s._id).balance).toBe(500);
      expect(engine.getAccount(d._id).balance).toBe(100);
    });

    it('rejects transfer with negative amount (-50)', () => {
      const s = engine.createAccount({ id: 'b2_s', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'b2_d', currency: 'MYR', balance: 100 });

      expect(() => {
        engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: -50 });
      }).toThrow(/Transfer amount must be a positive number/);
    });

    it('rejects transfer with tiny negative fractional amount (-0.001)', () => {
      const s = engine.createAccount({ id: 'b3_s', currency: 'USD', balance: 100 });
      const d = engine.createAccount({ id: 'b3_d', currency: 'USD', balance: 50 });

      expect(() => {
        engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: -0.001 });
      }).toThrow(/Transfer amount must be a positive number/);
    });

    it('rejects transfer with NaN or non-numeric string amount', () => {
      const s = engine.createAccount({ id: 'b4_s', currency: 'EUR', balance: 100 });
      const d = engine.createAccount({ id: 'b4_d', currency: 'EUR', balance: 50 });

      expect(() => {
        engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 'not_a_number' });
      }).toThrow(/Transfer amount must be a positive number/);
    });

    it('rejects update operation changing transfer amount to zero or negative', () => {
      const s = engine.createAccount({ id: 'b5_s', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'b5_d', currency: 'MYR', balance: 100 });

      const tx = engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 100 });
      expect(engine.getAccount(s._id).balance).toBe(400);

      expect(() => {
        engine.updateTransfer(tx._id, { amount: 0 });
      }).toThrow(/Transfer amount must be a positive number/);

      expect(() => {
        engine.updateTransfer(tx._id, { amount: -25 });
      }).toThrow(/Transfer amount must be a positive number/);

      // Verify original balances remained intact after failed update
      expect(engine.getAccount(s._id).balance).toBe(400);
      expect(engine.getAccount(d._id).balance).toBe(200);
    });
  });

  // =========================================================================
  // Category 2: Same Source and Destination Account ID Rejection
  // =========================================================================
  describe('Boundary 2: Same Source and Destination Account Rejection', () => {
    it('rejects transfer where source and destination account ID are identical strings', () => {
      const acc = engine.createAccount({ id: 'same_acc_1', currency: 'MYR', balance: 500 });

      expect(() => {
        engine.createTransfer({ accountId: acc._id, toAccountId: acc._id, amount: 50 });
      }).toThrow(/Source and destination accounts must be different/);

      expect(engine.getAccount(acc._id).balance).toBe(500);
    });

    it('rejects transfer between same account when IDs are passed as objects or numeric strings', () => {
      const acc = engine.createAccount({ id: 'same_acc_2', currency: 'USD', balance: 1000 });

      expect(() => {
        engine.createTransfer({ accountId: String(acc._id), toAccountId: String(acc._id), amount: 100 });
      }).toThrow(/Source and destination accounts must be different/);
    });

    it('rejects transfer update modifying destination account to match source account', () => {
      const s = engine.createAccount({ id: 'same_s', currency: 'GBP', balance: 400 });
      const d = engine.createAccount({ id: 'same_d', currency: 'GBP', balance: 100 });

      const tx = engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 50 });
      expect(engine.getAccount(s._id).balance).toBe(350);
      expect(engine.getAccount(d._id).balance).toBe(150);

      expect(() => {
        engine.updateTransfer(tx._id, { toAccountId: s._id });
      }).toThrow(/Source and destination accounts must be different/);

      // Ensure rollback restores state properly
      expect(engine.getAccount(s._id).balance).toBe(350);
      expect(engine.getAccount(d._id).balance).toBe(150);
    });

    it('rejects transfer update modifying source account to match destination account', () => {
      const s = engine.createAccount({ id: 'same_s2', currency: 'CAD', balance: 300 });
      const d = engine.createAccount({ id: 'same_d2', currency: 'CAD', balance: 100 });

      const tx = engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 40 });

      expect(() => {
        engine.updateTransfer(tx._id, { accountId: d._id });
      }).toThrow(/Source and destination accounts must be different/);

      expect(engine.getAccount(s._id).balance).toBe(260);
      expect(engine.getAccount(d._id).balance).toBe(140);
    });

    it('rejects transfer creation when source or destination ID is empty or undefined', () => {
      const acc = engine.createAccount({ id: 'exist_acc', currency: 'MYR', balance: 200 });

      expect(() => {
        engine.createTransfer({ accountId: acc._id, toAccountId: '', amount: 50 });
      }).toThrow(/Missing required transfer account identifiers/);

      expect(() => {
        engine.createTransfer({ accountId: undefined, toAccountId: acc._id, amount: 50 });
      }).toThrow(/Missing required transfer account identifiers/);
    });
  });

  // =========================================================================
  // Category 3: Exchange Rate Validation & Missing Rate Rejection
  // =========================================================================
  describe('Boundary 3: Exchange Rate Validation & Constraints', () => {
    it('rejects cross-currency transfer when exchangeRate and toAmount are both omitted', () => {
      const s = engine.createAccount({ id: 'xr_s1', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'xr_d1', currency: 'USD', balance: 100 });

      expect(() => {
        engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 50 });
      }).toThrow(/Exchange rate or target amount is required for cross-currency transfers/);
    });

    it('rejects cross-currency transfer with zero exchange rate (exchangeRate: 0)', () => {
      const s = engine.createAccount({ id: 'xr_s2', currency: 'EUR', balance: 500 });
      const d = engine.createAccount({ id: 'xr_d2', currency: 'USD', balance: 100 });

      expect(() => {
        engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 50, exchangeRate: 0 });
      }).toThrow(/Exchange rate must be greater than zero/);
    });

    it('rejects cross-currency transfer with negative exchange rate (exchangeRate: -1.2)', () => {
      const s = engine.createAccount({ id: 'xr_s3', currency: 'USD', balance: 500 });
      const d = engine.createAccount({ id: 'xr_d3', currency: 'GBP', balance: 100 });

      expect(() => {
        engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 50, exchangeRate: -1.2 });
      }).toThrow(/Exchange rate must be greater than zero/);
    });

    it('rejects cross-currency transfer with negative toAmount (toAmount: -5)', () => {
      const s = engine.createAccount({ id: 'xr_s4', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'xr_d4', currency: 'USD', balance: 100 });

      expect(() => {
        engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 50, toAmount: -5 });
      }).toThrow(/Target amount must be greater than zero/);
    });

    it('rejects cross-currency transfer with currency parameter mismatched from source account', () => {
      const s = engine.createAccount({ id: 'xr_s5', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'xr_d5', currency: 'USD', balance: 100 });

      expect(() => {
        engine.createTransfer({
          accountId: s._id,
          toAccountId: d._id,
          amount: 50,
          currency: 'EUR', // invalid: source account is MYR
          exchangeRate: 0.22
        });
      }).toThrow(/must match source account currency/);
    });
  });

  // =========================================================================
  // Category 4: Decimal Precision & Rounding Corner Cases
  // =========================================================================
  describe('Boundary 4: Decimal Precision & Rounding Corner Cases', () => {
    it('handles exact minimum non-zero transfer (0.01) without rounding loss', () => {
      const s = engine.createAccount({ id: 'prec_s1', currency: 'USD', balance: 1.00 });
      const d = engine.createAccount({ id: 'prec_d1', currency: 'USD', balance: 0.00 });

      const tx = engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 0.01 });

      expect(tx.amount).toBe(0.01);
      expect(engine.getAccount(s._id).balance).toBe(0.99);
      expect(engine.getAccount(d._id).balance).toBe(0.01);
    });

    it('rounds 33.33 * 0.22 (= 7.3326) correctly to 7.33 USD', () => {
      const s = engine.createAccount({ id: 'prec_s2', currency: 'MYR', balance: 100 });
      const d = engine.createAccount({ id: 'prec_d2', currency: 'USD', balance: 0 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 33.33,
        exchangeRate: 0.22
      });

      expect(tx.toAmount).toBe(7.33);
      expect(engine.getAccount(d._id).balance).toBe(7.33);
    });

    it('handles high exchange rate USD to JPY (1 USD = 155.456 JPY) rounding accurately', () => {
      const s = engine.createAccount({ id: 'prec_s3', currency: 'USD', balance: 100 });
      const d = engine.createAccount({ id: 'prec_d3', currency: 'JPY', balance: 0 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 12.50,
        exchangeRate: 155.456
      });

      // 12.50 * 155.456 = 1943.20
      expect(tx.toAmount).toBe(1943.20);
      expect(engine.getAccount(d._id).balance).toBe(1943.20);
    });

    it('handles microscopic exchange rate JPY to USD (1 JPY = 0.006432 USD)', () => {
      const s = engine.createAccount({ id: 'prec_s4', currency: 'JPY', balance: 100000 });
      const d = engine.createAccount({ id: 'prec_d4', currency: 'USD', balance: 0 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 35000,
        exchangeRate: 0.006432
      });

      // 35000 * 0.006432 = 225.12
      expect(tx.toAmount).toBe(225.12);
      expect(engine.getAccount(d._id).balance).toBe(225.12);
    });

    it('handles repeating decimal conversion (100 / 3) rounded to 2 decimals', () => {
      const s = engine.createAccount({ id: 'prec_s5', currency: 'USD', balance: 100 });
      const d = engine.createAccount({ id: 'prec_d5', currency: 'EUR', balance: 0 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 100,
        exchangeRate: 1 / 3 // 0.3333333333...
      });

      expect(tx.toAmount).toBe(33.33);
      expect(engine.getAccount(d._id).balance).toBe(33.33);
    });
  });

  // =========================================================================
  // Category 5: Extreme Values & Robustness Boundaries
  // =========================================================================
  describe('Boundary 5: Extreme Values and Non-Existent Entities', () => {
    it('handles large transfer amounts (10,000,000.00) without float overflow', () => {
      const s = engine.createAccount({ id: 'big_s', currency: 'USD', balance: 50000000 });
      const d = engine.createAccount({ id: 'big_d', currency: 'EUR', balance: 1000000 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 10000000.00,
        exchangeRate: 0.92
      });

      expect(tx.toAmount).toBe(9200000.00);
      expect(engine.getAccount(s._id).balance).toBe(40000000.00);
      expect(engine.getAccount(d._id).balance).toBe(10200000.00);
    });

    it('rejects transfer when source account does not exist in engine', () => {
      const d = engine.createAccount({ id: 'nonex_d', currency: 'USD', balance: 100 });

      expect(() => {
        engine.createTransfer({ accountId: 'ghost_account_id', toAccountId: d._id, amount: 50 });
      }).toThrow(/Source account not found/);
    });

    it('rejects transfer when destination account does not exist in engine', () => {
      const s = engine.createAccount({ id: 'nonex_s', currency: 'USD', balance: 100 });

      expect(() => {
        engine.createTransfer({ accountId: s._id, toAccountId: 'ghost_dest_id', amount: 50 });
      }).toThrow(/Destination account not found/);
    });

    it('rejects deleting transaction with non-existent transaction ID', () => {
      expect(() => {
        engine.deleteTransaction('non_existent_tx_id');
      }).toThrow(/Transaction not found/);
    });

    it('rejects updating transaction with non-existent transaction ID', () => {
      expect(() => {
        engine.updateTransfer('non_existent_tx_id', { amount: 50 });
      }).toThrow(/Transfer transaction not found/);
    });
  });
});
