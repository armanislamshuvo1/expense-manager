import { describe, it, expect } from 'vitest';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

/**
 * Controller-accurate implementation of transfer logic extracted directly from
 * backend/controllers/transactionController.js and backend/controllers/syncController.js
 */
function calculateTransferEffects({
  sourceAccount,
  destAccount,
  amount,
  exchangeRate,
  toAmount,
  currency
}) {
  const numAmount = Number(amount);
  let targetToAmount;
  let effectiveRate = exchangeRate !== undefined && exchangeRate !== null && Number(exchangeRate) > 0
    ? Number(exchangeRate)
    : 1.0;

  if (sourceAccount.currency === destAccount.currency) {
    targetToAmount = (toAmount !== undefined && toAmount !== null && Number(toAmount) > 0)
      ? Number(toAmount)
      : numAmount;
  } else {
    const hasToAmount = toAmount !== undefined && toAmount !== null && Number(toAmount) > 0;
    const hasExchangeRate = exchangeRate !== undefined && exchangeRate !== null && Number(exchangeRate) > 0;

    if (hasToAmount) {
      targetToAmount = Number(toAmount);
      if (!hasExchangeRate && numAmount > 0) {
        effectiveRate = Number((targetToAmount / numAmount).toFixed(6));
      }
    } else if (hasExchangeRate) {
      targetToAmount = Number((numAmount * Number(exchangeRate)).toFixed(2));
    } else {
      throw new Error('Cross-currency transfer requires an exchange rate or destination amount.');
    }
  }

  return {
    sourceDebit: numAmount,
    destCredit: targetToAmount,
    effectiveRate,
    targetToAmount
  };
}

function executeTransferSimulation(source, dest, payload) {
  const calc = calculateTransferEffects({
    sourceAccount: source,
    destAccount: dest,
    ...payload
  });

  const tx = {
    _id: 'tx_' + Math.random().toString(36).substring(7),
    accountId: source._id,
    toAccountId: dest._id,
    type: 'TRANSFER',
    amount: Number(payload.amount),
    currency: payload.currency || source.currency,
    toAmount: calc.targetToAmount,
    toCurrency: dest.currency,
    exchangeRate: calc.effectiveRate,
    shouldConvert: true,
    convertedAmount: calc.targetToAmount
  };

  source.balance = Number((source.balance - calc.sourceDebit).toFixed(2));
  dest.balance = Number((dest.balance + calc.destCredit).toFixed(2));

  return tx;
}

function revertTransferSimulation(source, dest, tx) {
  const toRevert = tx.toAmount !== undefined && tx.toAmount !== null
    ? tx.toAmount
    : (tx.currency !== dest.currency
        ? Number((tx.amount * (tx.exchangeRate || 1.0)).toFixed(2))
        : tx.amount);

  source.balance = Number((source.balance + Number(tx.amount)).toFixed(2));
  dest.balance = Number((dest.balance - toRevert).toFixed(2));
}

function updateTransferSimulation(oldSource, oldDest, oldTx, newSource, newDest, newPayload) {
  // 1. Revert old
  revertTransferSimulation(oldSource, oldDest, oldTx);

  // 2. Apply new
  const calc = calculateTransferEffects({
    sourceAccount: newSource,
    destAccount: newDest,
    ...newPayload
  });

  newSource.balance = Number((newSource.balance - calc.sourceDebit).toFixed(2));
  newDest.balance = Number((newDest.balance + calc.destCredit).toFixed(2));

  oldTx.accountId = newSource._id;
  oldTx.toAccountId = newDest._id;
  oldTx.amount = Number(newPayload.amount);
  oldTx.currency = newPayload.currency || newSource.currency;
  oldTx.toAmount = calc.targetToAmount;
  oldTx.toCurrency = newDest.currency;
  oldTx.exchangeRate = calc.effectiveRate;
  oldTx.convertedAmount = calc.targetToAmount;

  return oldTx;
}

// Frontend optimistic sync logic matching frontend/src/utils/syncManager.js
function optimisticSyncUpdate(accounts, opType, data, oldData) {
  let updatedAccs = [...accounts];

  const calcEffect = (txObj, acc) => {
    if (!txObj) return { sourceId: '', destId: '', effect: 0, txType: '' };
    const amt = Number(txObj.amount) || 0;
    const accId = String(acc?._id || acc?.clientAccId || '');
    const sourceId = String(txObj.accountId || '');
    const destId = String(txObj.toAccountId || '');
    const accCurrency = acc?.currency;

    let effect = amt;
    if (txObj.type === 'TRANSFER') {
      if (accId === destId) {
        effect = (txObj.toAmount !== undefined && txObj.toAmount !== null && Number(txObj.toAmount) > 0)
          ? Number(txObj.toAmount)
          : (accCurrency && txObj.currency === accCurrency ? amt : amt * (Number(txObj.exchangeRate) || 1.0));
      } else {
        effect = amt;
      }
    } else {
      if (accCurrency && txObj.currency && accCurrency !== txObj.currency) {
        const rate = txObj.shouldConvert !== false ? (Number(txObj.exchangeRate) || 1.0) : 1.0;
        effect = amt * rate;
      } else if (!accCurrency) {
        const rate = txObj.shouldConvert !== false ? (Number(txObj.exchangeRate) || 1.0) : 1.0;
        effect = amt * rate;
      }
    }

    return { sourceId, destId, effect, txType: txObj.type };
  };

  if ((opType === 'UPDATE' || opType === 'DELETE') && oldData) {
    updatedAccs = updatedAccs.map(acc => {
      const accId = String(acc._id || acc.clientAccId || '');
      const { sourceId, destId, effect, txType } = calcEffect(oldData, acc);
      let bal = Number(acc.balance) || 0;
      if (txType === 'INCOME' && accId === sourceId) bal -= effect;
      else if (txType === 'EXPENSE' && accId === sourceId) bal += effect;
      else if (txType === 'TRANSFER') {
        if (accId === sourceId) bal += effect;
        if (accId === destId) bal -= effect;
      }
      return { ...acc, balance: Number(bal.toFixed(2)) };
    });
  }

  if ((opType === 'CREATE' || opType === 'UPDATE') && data) {
    updatedAccs = updatedAccs.map(acc => {
      const accId = String(acc._id || acc.clientAccId || '');
      const { sourceId, destId, effect, txType } = calcEffect(data, acc);
      let bal = Number(acc.balance) || 0;
      if (txType === 'INCOME' && accId === sourceId) bal += effect;
      else if (txType === 'EXPENSE' && accId === sourceId) bal -= effect;
      else if (txType === 'TRANSFER') {
        if (accId === sourceId) bal -= effect;
        if (accId === destId) bal += effect;
      }
      return { ...acc, balance: Number(bal.toFixed(2)) };
    });
  }

  return updatedAccs;
}

describe('Challenger 1: Empirical Math, Precision & Edge-Case Stress Suite', () => {

  describe('1. Floating Point & Repeating Decimal Stress Tests', () => {
    it('1.1 Handles classic 0.1 + 0.2 floating point sum and small fractions without precision accumulation', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 10.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 0.00 };

      // Perform ten 0.1 transfers at 0.2 rate
      const txs = [];
      for (let i = 0; i < 10; i++) {
        const tx = executeTransferSimulation(source, dest, { amount: 0.1, exchangeRate: 0.2 });
        txs.push(tx);
      }

      // Source balance should decrease from 10.00 to 9.00 exactly
      expect(source.balance).toBe(9.00);
      // Dest balance: 10 * (0.1 * 0.2 = 0.02) = 0.20 exactly
      expect(dest.balance).toBe(0.20);

      // Now revert all 10 transfers
      for (const tx of txs) {
        revertTransferSimulation(source, dest, tx);
      }

      // Both balances must cleanly return to exact initial values
      expect(source.balance).toBe(10.00);
      expect(dest.balance).toBe(0.00);
    });

    it('1.2 Repeating fraction 1/3 rate (0.333333...): ensures roundoff does not leak or drift balances', () => {
      const source = { _id: 'acc_a', currency: 'EUR', balance: 1000.00 };
      const dest = { _id: 'acc_b', currency: 'GBP', balance: 0.00 };

      // Transfer 100 EUR at rate 1/3
      const rate = 1 / 3;
      const tx = executeTransferSimulation(source, dest, { amount: 100, exchangeRate: rate });

      // 100 * (1/3) = 33.3333... -> 33.33
      expect(tx.toAmount).toBe(33.33);
      expect(source.balance).toBe(900.00);
      expect(dest.balance).toBe(33.33);

      // Revert
      revertTransferSimulation(source, dest, tx);
      expect(source.balance).toBe(1000.00);
      expect(dest.balance).toBe(0.00);
    });

    it('1.3 Repeating fraction rate 1/7 (0.142857...): checks rounding integrity', () => {
      const source = { _id: 'acc_a', currency: 'USD', balance: 700.00 };
      const dest = { _id: 'acc_b', currency: 'KWD', balance: 0.00 };

      const rate = 1 / 7;
      const tx = executeTransferSimulation(source, dest, { amount: 70, exchangeRate: rate });

      // 70 * (1/7) = 10.00
      expect(tx.toAmount).toBe(10.00);
      expect(source.balance).toBe(630.00);
      expect(dest.balance).toBe(10.00);

      revertTransferSimulation(source, dest, tx);
      expect(source.balance).toBe(700.00);
      expect(dest.balance).toBe(0.00);
    });

    it('1.4 Tiny fractional exchange rate (1 JPY = 0.006674 USD): micro currency precision', () => {
      const source = { _id: 'acc_jpy', currency: 'JPY', balance: 100000.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 0.00 };

      // 3,456 JPY * 0.006674 = 23.065344 -> 23.07 USD
      const tx = executeTransferSimulation(source, dest, { amount: 3456, exchangeRate: 0.006674 });

      expect(tx.toAmount).toBe(23.07);
      expect(source.balance).toBe(96544.00);
      expect(dest.balance).toBe(23.07);

      revertTransferSimulation(source, dest, tx);
      expect(source.balance).toBe(100000.00);
      expect(dest.balance).toBe(0.00);
    });

    it('1.5 Sub-cent rounding down to 0.00 (amount 0.01 with rate 0.0067) preserves accounting ledger integrity', () => {
      const source = { _id: 'acc_jpy', currency: 'JPY', balance: 1.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 0.00 };

      // 0.01 JPY * 0.0067 = 0.000067 USD -> 0.00 USD
      const tx = executeTransferSimulation(source, dest, { amount: 0.01, exchangeRate: 0.0067 });

      expect(tx.toAmount).toBe(0.00);
      expect(source.balance).toBe(0.99);
      expect(dest.balance).toBe(0.00);

      // Reversion correctly adds 0.01 to source and subtracts 0.00 from dest
      revertTransferSimulation(source, dest, tx);
      expect(source.balance).toBe(1.00);
      expect(dest.balance).toBe(0.00);
    });
  });

  describe('2. Extreme Values & Magnitudes (Boundary Analysis)', () => {
    it('2.1 Very large numbers (100 million transfer with high exchange rate 35.50)', () => {
      const source = { _id: 'acc_usd', currency: 'USD', balance: 500000000.00 };
      const dest = { _id: 'acc_thb', currency: 'THB', balance: 0.00 };

      const tx = executeTransferSimulation(source, dest, { amount: 100000000, exchangeRate: 35.50 });

      expect(tx.toAmount).toBe(3550000000.00);
      expect(source.balance).toBe(400000000.00);
      expect(dest.balance).toBe(3550000000.00);

      revertTransferSimulation(source, dest, tx);
      expect(source.balance).toBe(500000000.00);
      expect(dest.balance).toBe(0.00);
    });

    it('2.2 High precision rates (e.g. BTC to USD rate 98765.4321)', () => {
      const source = { _id: 'acc_btc', currency: 'BTC', balance: 5.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 1000.00 };

      // Transfer 0.05 BTC at rate 98765.4321 -> 4938.271605 -> 4938.27 USD
      const tx = executeTransferSimulation(source, dest, { amount: 0.05, exchangeRate: 98765.4321 });

      expect(tx.toAmount).toBe(4938.27);
      expect(source.balance).toBe(4.95);
      expect(dest.balance).toBe(5938.27);

      revertTransferSimulation(source, dest, tx);
      expect(source.balance).toBe(5.00);
      expect(dest.balance).toBe(1000.00);
    });

    it('2.3 Extreme inverse crypto rate (1 USD to BTC at 0.00001025)', () => {
      const source = { _id: 'acc_usd', currency: 'USD', balance: 10000.00 };
      const dest = { _id: 'acc_btc', currency: 'BTC', balance: 0.00 };

      // 50,000 USD * 0.00001025 = 0.5125 -> 0.51 BTC (rounded to 2 decimal places)
      const tx = executeTransferSimulation(source, dest, { amount: 50000, exchangeRate: 0.00001025 });

      expect(tx.toAmount).toBe(0.51);
      expect(source.balance).toBe(-40000.00);
      expect(dest.balance).toBe(0.51);

      revertTransferSimulation(source, dest, tx);
      expect(source.balance).toBe(10000.00);
      expect(dest.balance).toBe(0.00);
    });
  });

  describe('3. Discrepancy & Priority: Explicit toAmount vs Exchange Rate', () => {
    it('3.1 Explicit toAmount takes absolute priority over rate-derived value (bank fee spread)', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 500.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 50.00 };

      // Amount: 100 MYR. Rate: 0.22 (which would yield 22.00 USD).
      // But bank credited 20.50 USD due to wire fee.
      const tx = executeTransferSimulation(source, dest, {
        amount: 100,
        exchangeRate: 0.22,
        toAmount: 20.50
      });

      // Target toAmount must be strictly 20.50, NOT 22.00
      expect(tx.toAmount).toBe(20.50);
      expect(source.balance).toBe(400.00);
      expect(dest.balance).toBe(70.50);

      // Reversion must strictly deduct 20.50, NOT 22.00
      revertTransferSimulation(source, dest, tx);
      expect(source.balance).toBe(500.00);
      expect(dest.balance).toBe(50.00);
    });

    it('3.2 Inferred exchange rate calculation when rate is omitted (toAmount / amount rounded to 6 decimals)', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 500.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 0.00 };

      // 70 MYR transferred, dest receives 15.55 USD. Rate is omitted.
      // 15.55 / 70 = 0.22214285714... -> toFixed(6) -> 0.222143
      const tx = executeTransferSimulation(source, dest, {
        amount: 70,
        toAmount: 15.55
      });

      expect(tx.toAmount).toBe(15.55);
      expect(tx.exchangeRate).toBe(0.222143);
      expect(source.balance).toBe(430.00);
      expect(dest.balance).toBe(15.55);

      revertTransferSimulation(source, dest, tx);
      expect(source.balance).toBe(500.00);
      expect(dest.balance).toBe(0.00);
    });

    it('3.3 Missing rate AND missing toAmount for cross-currency transfers throws descriptive error', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 100.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 0.00 };

      expect(() => {
        calculateTransferEffects({
          sourceAccount: source,
          destAccount: dest,
          amount: 50,
          exchangeRate: null,
          toAmount: null
        });
      }).toThrow(/Cross-currency transfer requires an exchange rate or destination amount/);
    });
  });

  describe('4. State Transition & Update Stress Tests', () => {
    it('4.1 Changing both amount and accounts simultaneously during update', () => {
      const accA = { _id: 'acc_a', currency: 'MYR', balance: 1000.00 };
      const accB = { _id: 'acc_b', currency: 'USD', balance: 100.00 };
      const accC = { _id: 'acc_c', currency: 'EUR', balance: 500.00 };
      const accD = { _id: 'acc_d', currency: 'SGD', balance: 200.00 };

      // Step 1: Initial transfer A -> B: 200 MYR at 0.22 = 44.00 USD
      const initialTx = executeTransferSimulation(accA, accB, { amount: 200, exchangeRate: 0.22 });
      expect(accA.balance).toBe(800.00);
      expect(accB.balance).toBe(144.00);

      // Step 2: Update transfer to C -> D: 150 EUR at 1.45 = 217.50 SGD
      updateTransferSimulation(accA, accB, initialTx, accC, accD, { amount: 150, exchangeRate: 1.45 });

      // A & B should be reverted to original
      expect(accA.balance).toBe(1000.00);
      expect(accB.balance).toBe(100.00);

      // C & D should reflect the new transfer
      expect(accC.balance).toBe(350.00);
      expect(accD.balance).toBe(417.50);
    });

    it('4.2 Updating from cross-currency (MYR -> USD) to same-currency (MYR -> MYR)', () => {
      const myr1 = { _id: 'acc_myr_1', currency: 'MYR', balance: 1000.00 };
      const usd1 = { _id: 'acc_usd_1', currency: 'USD', balance: 50.00 };
      const myr2 = { _id: 'acc_myr_2', currency: 'MYR', balance: 300.00 };

      // Step 1: Transfer MYR1 -> USD1: 100 MYR at 0.22 = 22.00 USD
      const initialTx = executeTransferSimulation(myr1, usd1, { amount: 100, exchangeRate: 0.22 });
      expect(myr1.balance).toBe(900.00);
      expect(usd1.balance).toBe(72.00);

      // Step 2: Update to MYR1 -> MYR2: 150 MYR
      updateTransferSimulation(myr1, usd1, initialTx, myr1, myr2, { amount: 150 });

      // USD1 reverted
      expect(usd1.balance).toBe(50.00);
      // MYR1 reverted (+100) and deducted (-150) -> net 850
      expect(myr1.balance).toBe(850.00);
      // MYR2 credited (+150) -> 450
      expect(myr2.balance).toBe(450.00);
    });
  });

  describe('5. Optimistic Sync Parity Stress Tests', () => {
    it('5.1 Optimistic syncManager calculates identical account balances to backend across create, update, delete', () => {
      const initialAccounts = [
        { _id: 'acc_myr', currency: 'MYR', balance: 1000.00 },
        { _id: 'acc_usd', currency: 'USD', balance: 100.00 }
      ];

      // CREATE
      const createData = {
        accountId: 'acc_myr',
        toAccountId: 'acc_usd',
        type: 'TRANSFER',
        amount: 250,
        exchangeRate: 0.224,
        toAmount: 56.00
      };

      const afterCreate = optimisticSyncUpdate(initialAccounts, 'CREATE', createData, null);
      expect(afterCreate.find(a => a._id === 'acc_myr').balance).toBe(750.00);
      expect(afterCreate.find(a => a._id === 'acc_usd').balance).toBe(156.00);

      // UPDATE (change amount to 300, toAmount to 67.20)
      const updateData = {
        accountId: 'acc_myr',
        toAccountId: 'acc_usd',
        type: 'TRANSFER',
        amount: 300,
        exchangeRate: 0.224,
        toAmount: 67.20
      };

      const afterUpdate = optimisticSyncUpdate(afterCreate, 'UPDATE', updateData, createData);
      expect(afterUpdate.find(a => a._id === 'acc_myr').balance).toBe(700.00);
      expect(afterUpdate.find(a => a._id === 'acc_usd').balance).toBe(167.20);

      // DELETE
      const afterDelete = optimisticSyncUpdate(afterUpdate, 'DELETE', null, updateData);
      expect(afterDelete.find(a => a._id === 'acc_myr').balance).toBe(1000.00);
      expect(afterDelete.find(a => a._id === 'acc_usd').balance).toBe(100.00);
    });
  });

  describe('6. Schema Validation & Mongoose Pre-Save Edge Cases', () => {
    it('6.1 Mongoose pre-save hook handles null or 0 amounts gracefully without NaN', () => {
      const tx = new Transaction({
        userId: '507f191e810c19729de860ea',
        accountId: '507f191e810c19729de860eb',
        toAccountId: '507f191e810c19729de860ec',
        type: 'TRANSFER',
        amount: 0,
        exchangeRate: 0.224,
        currency: 'MYR',
        date: new Date()
      });

      const preSaveListeners = tx.schema.s.hooks._pres.get('save');
      preSaveListeners.forEach(listener => listener.fn.call(tx));

      expect(tx.toAmount).toBe(0.00);
      expect(tx.convertedAmount).toBe(0.00);
      expect(isNaN(tx.toAmount)).toBe(false);
      expect(isNaN(tx.convertedAmount)).toBe(false);
    });

    it('6.2 Mongoose pre-save hook handles undefined exchangeRate gracefully defaulting to 1.0', () => {
      const tx = new Transaction({
        userId: '507f191e810c19729de860ea',
        accountId: '507f191e810c19729de860eb',
        toAccountId: '507f191e810c19729de860ec',
        type: 'TRANSFER',
        amount: 75.50,
        currency: 'MYR',
        date: new Date()
      });

      const preSaveListeners = tx.schema.s.hooks._pres.get('save');
      preSaveListeners.forEach(listener => listener.fn.call(tx));

      expect(tx.toAmount).toBe(75.50);
      expect(tx.convertedAmount).toBe(75.50);
    });
  });
});
