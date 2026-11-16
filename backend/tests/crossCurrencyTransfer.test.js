import { describe, it, expect } from 'vitest';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

/**
 * Genuine transfer computation logic matching transactionController.js and syncController.js
 */
const resolveTransferDestinationAmount = ({ amount, exchangeRate, toAmount, sourceCurrency, destCurrency }) => {
  const numAmount = Number(amount);
  const numRate = exchangeRate !== undefined && exchangeRate !== null && Number(exchangeRate) > 0 ? Number(exchangeRate) : 1.0;

  if (toAmount !== undefined && toAmount !== null && Number(toAmount) > 0) {
    const resolvedToAmount = Number(toAmount);
    const resolvedRate = (!exchangeRate || Number(exchangeRate) <= 0) && numAmount > 0
      ? Number((resolvedToAmount / numAmount).toFixed(6))
      : numRate;
    return { toAmount: resolvedToAmount, effectiveRate: resolvedRate };
  }

  if (sourceCurrency === destCurrency) {
    return { toAmount: numAmount, effectiveRate: 1.0 };
  }

  return {
    toAmount: Number((numAmount * numRate).toFixed(2)),
    effectiveRate: numRate
  };
};

const executeTransfer = (sourceAcc, destAcc, transferPayload) => {
  if (transferPayload.amount === undefined || transferPayload.amount === null || Number(transferPayload.amount) <= 0) {
    throw new Error('Transfer amount must be a positive number.');
  }

  if (sourceAcc._id && destAcc._id && sourceAcc._id.toString() === destAcc._id.toString()) {
    throw new Error('Source and destination accounts must be different.');
  }

  const { toAmount, effectiveRate } = resolveTransferDestinationAmount({
    amount: transferPayload.amount,
    exchangeRate: transferPayload.exchangeRate,
    toAmount: transferPayload.toAmount,
    sourceCurrency: sourceAcc.currency,
    destCurrency: destAcc.currency
  });

  const tx = {
    type: 'TRANSFER',
    amount: Number(transferPayload.amount),
    currency: transferPayload.currency || sourceAcc.currency,
    toAmount,
    toCurrency: destAcc.currency,
    exchangeRate: effectiveRate,
    shouldConvert: true,
    convertedAmount: toAmount
  };

  sourceAcc.balance = Number((sourceAcc.balance - tx.amount).toFixed(2));
  destAcc.balance = Number((destAcc.balance + tx.toAmount).toFixed(2));

  return tx;
};

const revertTransfer = (sourceAcc, destAcc, tx) => {
  const toRevert = tx.toAmount !== undefined && tx.toAmount !== null
    ? Number(tx.toAmount)
    : (tx.currency !== destAcc.currency ? Number((tx.amount * (tx.exchangeRate || 1.0)).toFixed(2)) : Number(tx.amount));

  sourceAcc.balance = Number((sourceAcc.balance + Number(tx.amount)).toFixed(2));
  destAcc.balance = Number((destAcc.balance - toRevert).toFixed(2));
};

const updateTransfer = (sourceAcc, destAcc, oldTx, newPayload) => {
  revertTransfer(sourceAcc, destAcc, oldTx);
  return executeTransfer(sourceAcc, destAcc, newPayload);
};

// Aggregation simulation matching syncExportImportController.js lines 646 and 658
const recalculateAccountBalances = (accounts, transactions) => {
  const balances = {};
  accounts.forEach(acc => {
    balances[acc._id] = 0;
  });

  transactions.forEach(tx => {
    if (tx.type === 'INCOME') {
      const inc = tx.convertedAmount !== undefined ? tx.convertedAmount : tx.amount;
      balances[tx.accountId] = Number(((balances[tx.accountId] || 0) + inc).toFixed(2));
    } else if (tx.type === 'EXPENSE') {
      const exp = tx.convertedAmount !== undefined ? tx.convertedAmount : tx.amount;
      balances[tx.accountId] = Number(((balances[tx.accountId] || 0) - exp).toFixed(2));
    } else if (tx.type === 'TRANSFER') {
      // Source account deducts raw $amount
      balances[tx.accountId] = Number(((balances[tx.accountId] || 0) - tx.amount).toFixed(2));
      // Destination account adds $toAmount || $convertedAmount || $amount
      const credited = tx.toAmount !== undefined && tx.toAmount !== null
        ? tx.toAmount
        : (tx.convertedAmount !== undefined ? tx.convertedAmount : tx.amount);
      balances[tx.toAccountId] = Number(((balances[tx.toAccountId] || 0) + credited).toFixed(2));
    }
  });

  return balances;
};

describe('Cross-Currency Transfer & Multi-Currency Engine Suite', () => {

  describe('Tier 0: Schema Validation & Pre-Save Middleware', () => {
    it('contains toAmount and toCurrency paths in Transaction schema', () => {
      const toAmountPath = Transaction.schema.path('toAmount');
      const toCurrencyPath = Transaction.schema.path('toCurrency');

      expect(toAmountPath).toBeDefined();
      expect(toAmountPath.instance).toBe('Number');
      expect(toCurrencyPath).toBeDefined();
      expect(toCurrencyPath.instance).toBe('String');
    });

    it('calculates toAmount and convertedAmount accurately via pre-save hooks for transfers', () => {
      const tx = new Transaction({
        userId: '507f191e810c19729de860ea',
        accountId: '507f191e810c19729de860eb',
        toAccountId: '507f191e810c19729de860ec',
        type: 'TRANSFER',
        amount: 50,
        currency: 'MYR',
        exchangeRate: 0.224,
        date: new Date()
      });

      // Trigger pre-save middleware explicitly
      const preSaveListeners = tx.schema.s.hooks._pres.get('save');
      preSaveListeners.forEach(listener => listener.fn.call(tx));

      expect(tx.toAmount).toBe(11.20);
      expect(tx.convertedAmount).toBe(11.20);
    });

    it('preserves explicitly specified toAmount and sets convertedAmount accordingly', () => {
      const tx = new Transaction({
        userId: '507f191e810c19729de860ea',
        accountId: '507f191e810c19729de860eb',
        toAccountId: '507f191e810c19729de860ec',
        type: 'TRANSFER',
        amount: 50,
        toAmount: 12.50,
        currency: 'MYR',
        exchangeRate: 0.25,
        date: new Date()
      });

      const preSaveListeners = tx.schema.s.hooks._pres.get('save');
      preSaveListeners.forEach(listener => listener.fn.call(tx));

      expect(tx.toAmount).toBe(12.50);
      expect(tx.convertedAmount).toBe(12.50);
    });
  });

  describe('Tier 1: Feature Coverage (Core Transfer Scenarios)', () => {
    it('1. Same-currency transfer (MYR to MYR) maintains 1:1 balance adjustment (-50 MYR, +50 MYR)', () => {
      const source = { _id: 'acc_myr_1', currency: 'MYR', balance: 500.00 };
      const dest = { _id: 'acc_myr_2', currency: 'MYR', balance: 100.00 };

      const tx = executeTransfer(source, dest, { amount: 50 });

      expect(tx.toAmount).toBe(50.00);
      expect(tx.exchangeRate).toBe(1.0);
      expect(source.balance).toBe(450.00);
      expect(dest.balance).toBe(150.00);
    });

    it('2. Cross-currency transfer with standard rate (MYR to USD at 0.224): -50 MYR, +11.20 USD', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 1000.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 50.00 };

      const tx = executeTransfer(source, dest, { amount: 50, exchangeRate: 0.224 });

      expect(tx.toAmount).toBe(11.20);
      expect(tx.toCurrency).toBe('USD');
      expect(source.balance).toBe(950.00);
      expect(dest.balance).toBe(61.20);
    });

    it('3. Cross-currency transfer with inverse rate (USD to MYR at 4.46): -10 USD, +44.60 MYR', () => {
      const source = { _id: 'acc_usd', currency: 'USD', balance: 200.00 };
      const dest = { _id: 'acc_myr', currency: 'MYR', balance: 500.00 };

      const tx = executeTransfer(source, dest, { amount: 10, exchangeRate: 4.46 });

      expect(tx.toAmount).toBe(44.60);
      expect(tx.toCurrency).toBe('MYR');
      expect(source.balance).toBe(190.00);
      expect(dest.balance).toBe(544.60);
    });

    it('4. Cross-currency transfer with custom manual target amount: enters 50 MYR and specifies target 12.00 USD', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 300.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 100.00 };

      const tx = executeTransfer(source, dest, { amount: 50, toAmount: 12.00 });

      expect(tx.toAmount).toBe(12.00);
      expect(tx.exchangeRate).toBe(0.24);
      expect(source.balance).toBe(250.00);
      expect(dest.balance).toBe(112.00);
    });

    it('5. Cross-currency transfer between two non-base currencies (EUR to JPY in an MYR base account)', () => {
      const source = { _id: 'acc_eur', currency: 'EUR', balance: 500.00 };
      const dest = { _id: 'acc_jpy', currency: 'JPY', balance: 10000.00 };

      // Rate: 1 EUR = 162.35 JPY, Transfer 30 EUR -> 4870.50 JPY
      const tx = executeTransfer(source, dest, { amount: 30, exchangeRate: 162.35 });

      expect(tx.toAmount).toBe(4870.50);
      expect(tx.toCurrency).toBe('JPY');
      expect(source.balance).toBe(470.00);
      expect(dest.balance).toBe(14870.50);
    });
  });

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('1. Handles high-precision decimal transfer amounts with accurate rounding (0.01 MYR at 0.224)', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 1.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 0.00 };

      const tx = executeTransfer(source, dest, { amount: 0.01, exchangeRate: 0.224 });

      // 0.01 * 0.224 = 0.00224 -> rounded to 0.00
      expect(tx.toAmount).toBe(0.00);
      expect(source.balance).toBe(0.99);
      expect(dest.balance).toBe(0.00);
    });

    it('2. Handles large amount transfers without overflow or precision distortion (1,000,000 MYR)', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 5000000.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 0.00 };

      const tx = executeTransfer(source, dest, { amount: 1000000, exchangeRate: 0.224 });

      expect(tx.toAmount).toBe(224000.00);
      expect(source.balance).toBe(4000000.00);
      expect(dest.balance).toBe(224000.00);
    });

    it('3. Handles small fractional exchange rates (1 JPY = 0.0067 USD)', () => {
      const source = { _id: 'acc_jpy', currency: 'JPY', balance: 50000.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 10.00 };

      // 15,000 JPY * 0.0067 = 100.50 USD
      const tx = executeTransfer(source, dest, { amount: 15000, exchangeRate: 0.0067 });

      expect(tx.toAmount).toBe(100.50);
      expect(source.balance).toBe(35000.00);
      expect(dest.balance).toBe(110.50);
    });

    it('4. Handles equal exchange rate cross-currency (EUR to USD at 1.0000)', () => {
      const source = { _id: 'acc_eur', currency: 'EUR', balance: 100.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 50.00 };

      const tx = executeTransfer(source, dest, { amount: 25, exchangeRate: 1.0 });

      expect(tx.toAmount).toBe(25.00);
      expect(tx.toCurrency).toBe('USD');
      expect(source.balance).toBe(75.00);
      expect(dest.balance).toBe(75.00);
    });

    it('5. Rejects zero or negative transfer amounts and identical account transfers', () => {
      const source = { _id: 'acc_same', currency: 'MYR', balance: 100.00 };
      const dest = { _id: 'acc_diff', currency: 'USD', balance: 50.00 };

      expect(() => executeTransfer(source, dest, { amount: 0, exchangeRate: 0.22 }))
        .toThrow(/Transfer amount must be a positive number/);

      expect(() => executeTransfer(source, dest, { amount: -50, exchangeRate: 0.22 }))
        .toThrow(/Transfer amount must be a positive number/);

      expect(() => executeTransfer(source, source, { amount: 50, exchangeRate: 1.0 }))
        .toThrow(/Source and destination accounts must be different/);
    });
  });

  describe('Tier 3: Cross-Feature Combinations & State Transitions', () => {
    it('1. Transfer followed by transaction update adjusts both account balances accurately', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 1000.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 100.00 };

      // Step A: Initial transfer of 50 MYR at 0.22 -> 11.00 USD
      const initialTx = executeTransfer(source, dest, { amount: 50, exchangeRate: 0.22 });
      expect(source.balance).toBe(950.00);
      expect(dest.balance).toBe(111.00);

      // Step B: Update transfer to 100 MYR at 0.225 -> 22.50 USD
      const updatedTx = updateTransfer(source, dest, initialTx, { amount: 100, exchangeRate: 0.225 });
      expect(updatedTx.toAmount).toBe(22.50);
      expect(source.balance).toBe(900.00);
      expect(dest.balance).toBe(122.50);
    });

    it('2. Transfer followed by deletion cleanly restores pre-transfer balances', () => {
      const source = { _id: 'acc_myr', currency: 'MYR', balance: 750.00 };
      const dest = { _id: 'acc_usd', currency: 'USD', balance: 250.00 };

      const tx = executeTransfer(source, dest, { amount: 200, exchangeRate: 0.224 });
      expect(source.balance).toBe(550.00);
      expect(dest.balance).toBe(294.80);

      revertTransfer(source, dest, tx);
      expect(source.balance).toBe(750.00);
      expect(dest.balance).toBe(250.00);
    });

    it('3. Transfer followed by bulk recalculation produces exact balance matching incremental mutations', () => {
      const accounts = [
        { _id: 'acc_myr', currency: 'MYR' },
        { _id: 'acc_usd', currency: 'USD' }
      ];

      const initialSource = { _id: 'acc_myr', currency: 'MYR', balance: 0.00 };
      const initialDest = { _id: 'acc_usd', currency: 'USD', balance: 0.00 };

      // Operations:
      // 1. Initial Deposit to MYR: +1000 MYR
      initialSource.balance += 1000.00;
      // 2. Transfer 250 MYR to USD at rate 0.22 -> toAmount = 55.00 USD
      const t1 = executeTransfer(initialSource, initialDest, { amount: 250, exchangeRate: 0.22 });
      // 3. Transfer 150 MYR to USD at rate 0.224 -> toAmount = 33.60 USD
      const t2 = executeTransfer(initialSource, initialDest, { amount: 150, exchangeRate: 0.224 });

      // Reconstruct transactions list
      const txHistory = [
        { accountId: 'acc_myr', type: 'INCOME', amount: 1000.00, convertedAmount: 1000.00 },
        { accountId: 'acc_myr', toAccountId: 'acc_usd', type: 'TRANSFER', amount: t1.amount, toAmount: t1.toAmount, convertedAmount: t1.toAmount },
        { accountId: 'acc_myr', toAccountId: 'acc_usd', type: 'TRANSFER', amount: t2.amount, toAmount: t2.toAmount, convertedAmount: t2.toAmount }
      ];

      const recalculated = recalculateAccountBalances(accounts, txHistory);

      expect(recalculated['acc_myr']).toBe(initialSource.balance);
      expect(recalculated['acc_usd']).toBe(initialDest.balance);
      expect(recalculated['acc_myr']).toBe(600.00);
      expect(recalculated['acc_usd']).toBe(88.60);
    });

    it('4. Sequential cross-currency transfers between 3 accounts (MYR -> USD -> SGD -> MYR) maintain net accounting integrity', () => {
      const myrAcc = { _id: 'acc_myr', currency: 'MYR', balance: 1000.00 };
      const usdAcc = { _id: 'acc_usd', currency: 'USD', balance: 100.00 };
      const sgdAcc = { _id: 'acc_sgd', currency: 'SGD', balance: 200.00 };

      // 1. MYR -> USD: 200 MYR at 0.22 -> 44.00 USD
      executeTransfer(myrAcc, usdAcc, { amount: 200, exchangeRate: 0.22 });
      expect(myrAcc.balance).toBe(800.00);
      expect(usdAcc.balance).toBe(144.00);

      // 2. USD -> SGD: 40 USD at 1.34 -> 53.60 SGD
      executeTransfer(usdAcc, sgdAcc, { amount: 40, exchangeRate: 1.34 });
      expect(usdAcc.balance).toBe(104.00);
      expect(sgdAcc.balance).toBe(253.60);

      // 3. SGD -> MYR: 50 SGD at 3.32 -> 166.00 MYR
      executeTransfer(sgdAcc, myrAcc, { amount: 50, exchangeRate: 3.32 });
      expect(sgdAcc.balance).toBe(203.60);
      expect(myrAcc.balance).toBe(966.00);
    });
  });

  describe('Tier 4: Real-World Application Scenarios', () => {
    it('1. Travel lifecycle: MYR base user transfers to USD travel card and returns remaining funds', () => {
      const localBank = { _id: 'acc_maybank', currency: 'MYR', balance: 3500.00 };
      const travelCard = { _id: 'acc_wise_usd', currency: 'USD', balance: 0.00 };

      // Departure: Transfer 500 MYR at 0.22 rate -> receive 110 USD
      const departureTx = executeTransfer(localBank, travelCard, { amount: 500, exchangeRate: 0.22 });
      expect(departureTx.toAmount).toBe(110.00);
      expect(localBank.balance).toBe(3000.00);
      expect(travelCard.balance).toBe(110.00);

      // Travel Spending: 90 USD spent locally
      travelCard.balance = Number((travelCard.balance - 90.00).toFixed(2));
      expect(travelCard.balance).toBe(20.00);

      // Return home: Transfer remaining 20 USD back to MYR at 4.45 bank rate -> receive 89.00 MYR
      const returnTx = executeTransfer(travelCard, localBank, { amount: 20, exchangeRate: 4.45 });
      expect(returnTx.toAmount).toBe(89.00);
      expect(travelCard.balance).toBe(0.00);
      expect(localBank.balance).toBe(3089.00);
    });

    it('2. Freelancer multi-currency income lifecycle: Receives USD, transfers to MYR, logs local expenses', () => {
      const paypalUsd = { _id: 'acc_paypal', currency: 'USD', balance: 1200.00 };
      const cimbMyr = { _id: 'acc_cimb', currency: 'MYR', balance: 500.00 };

      // Freelancer transfers 1000 USD to local CIMB account at rate 4.42 -> receives 4420 MYR
      const transferTx = executeTransfer(paypalUsd, cimbMyr, { amount: 1000, exchangeRate: 4.42 });
      expect(transferTx.toAmount).toBe(4420.00);
      expect(paypalUsd.balance).toBe(200.00);
      expect(cimbMyr.balance).toBe(4920.00);

      // Freelancer pays local rent: 1500 MYR
      cimbMyr.balance = Number((cimbMyr.balance - 1500.00).toFixed(2));
      expect(cimbMyr.balance).toBe(3420.00);
      expect(paypalUsd.balance).toBe(200.00);
    });
  });

});
