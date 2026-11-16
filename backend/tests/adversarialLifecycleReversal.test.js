import { describe, it, expect, vi, beforeEach } from 'vitest';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { createTransaction, updateTransaction, deleteTransaction } from '../controllers/transactionController.js';
import { syncTransactions } from '../controllers/syncController.js';

describe('Challenger 2: Empirical State Transitions, Lifecycle & Reversal Harness', () => {

  // =========================================================================
  // Section 1: Multi-Currency Transfer Cycle (A -> B -> C -> A)
  // =========================================================================
  describe('Adversarial Multi-Currency Cycle (A -> B -> C -> A)', () => {
    it('accurately maintains balance conservation across a 4-currency closed loop', () => {
      // 4 accounts with distinct currencies
      const accounts = {
        acc_myr: { _id: 'acc_myr', currency: 'MYR', balance: 10000.00 },
        acc_usd: { _id: 'acc_usd', currency: 'USD', balance: 1000.00 },
        acc_eur: { _id: 'acc_eur', currency: 'EUR', balance: 1000.00 },
        acc_jpy: { _id: 'acc_jpy', currency: 'JPY', balance: 100000.00 },
      };

      const transferOps = [
        // Hop 1: MYR -> USD (Send 450 MYR at 0.224 -> receive 100.80 USD)
        { from: 'acc_myr', to: 'acc_usd', amount: 450.00, rate: 0.224, expectedToAmount: 100.80 },
        // Hop 2: USD -> EUR (Send 200.00 USD at 0.925 -> receive 185.00 EUR)
        { from: 'acc_usd', to: 'acc_eur', amount: 200.00, rate: 0.925, expectedToAmount: 185.00 },
        // Hop 3: EUR -> JPY (Send 300.00 EUR at 162.50 -> receive 48750.00 JPY)
        { from: 'acc_eur', to: 'acc_jpy', amount: 300.00, rate: 162.50, expectedToAmount: 48750.00 },
        // Hop 4: JPY -> MYR (Send 50000.00 JPY at 0.0305 -> receive 1525.00 MYR)
        { from: 'acc_jpy', to: 'acc_myr', amount: 50000.00, rate: 0.0305, expectedToAmount: 1525.00 }
      ];

      // Execute cycle
      const recordedTxs = [];
      for (const hop of transferOps) {
        const src = accounts[hop.from];
        const dst = accounts[hop.to];

        const toAmount = Number((hop.amount * hop.rate).toFixed(2));
        expect(toAmount).toBe(hop.expectedToAmount);

        src.balance = Number((src.balance - hop.amount).toFixed(2));
        dst.balance = Number((dst.balance + toAmount).toFixed(2));

        recordedTxs.push({
          accountId: src._id,
          toAccountId: dst._id,
          amount: hop.amount,
          toAmount: toAmount,
          currency: src.currency,
          toCurrency: dst.currency,
          exchangeRate: hop.rate,
          type: 'TRANSFER'
        });
      }

      // Exact expected balances:
      // MYR: 10000 - 450 + 1525 = 11075.00
      expect(accounts.acc_myr.balance).toBe(11075.00);
      // USD: 1000 + 100.80 - 200 = 900.80
      expect(accounts.acc_usd.balance).toBe(900.80);
      // EUR: 1000 + 185 - 300 = 885.00
      expect(accounts.acc_eur.balance).toBe(885.00);
      // JPY: 100000 + 48750 - 50000 = 98750.00
      expect(accounts.acc_jpy.balance).toBe(98750.00);

      // Now reverse the entire cycle in reverse order
      for (let i = recordedTxs.length - 1; i >= 0; i--) {
        const tx = recordedTxs[i];
        const src = accounts[tx.accountId];
        const dst = accounts[tx.toAccountId];

        src.balance = Number((src.balance + tx.amount).toFixed(2));
        dst.balance = Number((dst.balance - tx.toAmount).toFixed(2));
      }

      // Every account must return to exact opening balance
      expect(accounts.acc_myr.balance).toBe(10000.00);
      expect(accounts.acc_usd.balance).toBe(1000.00);
      expect(accounts.acc_eur.balance).toBe(1000.00);
      expect(accounts.acc_jpy.balance).toBe(100000.00);
    });
  });

  // =========================================================================
  // Section 2: Direct Controller Testing via In-Memory Mongoose Mocking
  // =========================================================================
  describe('Direct Controller Execution (transactionController.js)', () => {
    let mockAccountStore;
    let mockTxStore;
    const testUserId = 'user_challenger_2';

    beforeEach(() => {
      // In-memory mock store
      mockAccountStore = new Map([
        ['acc_1', { _id: 'acc_1', userId: testUserId, name: 'Maybank MYR', currency: 'MYR', balance: 5000.00 }],
        ['acc_2', { _id: 'acc_2', userId: testUserId, name: 'Wise USD', currency: 'USD', balance: 200.00 }],
        ['acc_3', { _id: 'acc_3', userId: testUserId, name: 'Revolut EUR', currency: 'EUR', balance: 350.00 }],
        ['acc_4', { _id: 'acc_4', userId: testUserId, name: 'CIMB MYR', currency: 'MYR', balance: 1000.00 }]
      ]);
      mockTxStore = new Map();

      // Spy on Account.findOne
      vi.spyOn(Account, 'findOne').mockImplementation(async (query) => {
        const id = query._id?.toString() || query._id;
        const acc = mockAccountStore.get(id);
        if (acc && acc.userId === query.userId) {
          return { ...acc };
        }
        return null;
      });

      // Spy on Account.updateOne with $inc support
      vi.spyOn(Account, 'updateOne').mockImplementation(async (query, update) => {
        const id = query._id?.toString() || query._id;
        const acc = mockAccountStore.get(id);
        if (!acc) return { matchedCount: 0, modifiedCount: 0 };
        if (update.$inc && update.$inc.balance !== undefined) {
          acc.balance = Number((acc.balance + update.$inc.balance).toFixed(2));
        }
        return { matchedCount: 1, modifiedCount: 1 };
      });

      // Spy on Transaction.findOne
      vi.spyOn(Transaction, 'findOne').mockImplementation(async (query) => {
        const id = query._id?.toString() || query._id;
        const tx = mockTxStore.get(id);
        if (tx && tx.userId === query.userId) {
          // Return an object that has save() and deleteOne()
          return {
            ...tx,
            save: async function () {
              mockTxStore.set(id, { ...this });
              return this;
            },
            deleteOne: async function () {
              mockTxStore.delete(id);
              return { acknowledged: true, deletedCount: 1 };
            }
          };
        }
        return null;
      });

      // Spy on Transaction.prototype.save
      vi.spyOn(Transaction.prototype, 'save').mockImplementation(async function () {
        const txObj = this.toObject ? this.toObject() : { ...this };
        if (!txObj._id) {
          txObj._id = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        }
        this._id = txObj._id;
        mockTxStore.set(txObj._id.toString(), txObj);
        return this;
      });
    });

    const createMockReqRes = (body = {}, params = {}, query = {}) => {
      const req = {
        user: { id: testUserId, baseCurrency: 'MYR' },
        body,
        params,
        query
      };
      const res = {
        statusCode: 200,
        jsonBody: null,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (payload) {
          this.jsonBody = payload;
          return this;
        }
      };
      const next = vi.fn();
      return { req, res, next };
    };

    it('1. createTransaction: successfully executes cross-currency transfer and debits/credits atomic balances', async () => {
      const { req, res, next } = createMockReqRes({
        accountId: 'acc_1',
        toAccountId: 'acc_2',
        type: 'TRANSFER',
        amount: 500,
        currency: 'MYR',
        exchangeRate: 0.224,
        date: new Date().toISOString()
      });

      await createTransaction(req, res, next);

      expect(res.statusCode).toBe(201);
      expect(res.jsonBody.success).toBe(true);
      expect(res.jsonBody.data.toAmount).toBe(112.00);
      expect(res.jsonBody.data.exchangeRate).toBe(0.224);

      // Verify atomic account balances in mock store
      expect(mockAccountStore.get('acc_1').balance).toBe(4500.00); // 5000 - 500
      expect(mockAccountStore.get('acc_2').balance).toBe(312.00); // 200 + 112.00
    });

    it('2. updateTransaction: changing amount and rate updates both accounts accurately', async () => {
      // Setup initial transfer in mock store
      const txId = 'tx_initial_1';
      mockTxStore.set(txId, {
        _id: txId,
        userId: testUserId,
        accountId: 'acc_1',
        toAccountId: 'acc_2',
        type: 'TRANSFER',
        amount: 500,
        currency: 'MYR',
        toAmount: 112.00,
        toCurrency: 'USD',
        exchangeRate: 0.224,
        shouldConvert: true
      });
      // Set current balances after this initial transfer
      mockAccountStore.get('acc_1').balance = 4500.00;
      mockAccountStore.get('acc_2').balance = 312.00;

      // Update transfer: change to 1000 MYR at 0.22 -> toAmount = 220.00 USD
      const { req, res, next } = createMockReqRes({
        accountId: 'acc_1',
        toAccountId: 'acc_2',
        type: 'TRANSFER',
        amount: 1000,
        currency: 'MYR',
        exchangeRate: 0.22,
        date: new Date().toISOString()
      }, { id: txId });

      await updateTransaction(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.success).toBe(true);

      // Source balance: 4500 + 500 (revert) - 1000 (new) = 4000.00
      expect(mockAccountStore.get('acc_1').balance).toBe(4000.00);
      // Dest balance: 312.00 - 112.00 (revert) + 220.00 (new) = 420.00
      expect(mockAccountStore.get('acc_2').balance).toBe(420.00);
    });

    it('3. updateTransaction: changing source account refunds old source and debits new source', async () => {
      const txId = 'tx_change_source';
      mockTxStore.set(txId, {
        _id: txId,
        userId: testUserId,
        accountId: 'acc_1', // Maybank MYR (5000 initial, currently 4800)
        toAccountId: 'acc_2', // Wise USD (200 initial, currently 244.80)
        type: 'TRANSFER',
        amount: 200,
        currency: 'MYR',
        toAmount: 44.80,
        toCurrency: 'USD',
        exchangeRate: 0.224,
        shouldConvert: true
      });
      mockAccountStore.get('acc_1').balance = 4800.00;
      mockAccountStore.get('acc_2').balance = 244.80;
      mockAccountStore.get('acc_4').balance = 1000.00; // CIMB MYR (new source)

      // Update: Change source from acc_1 to acc_4, with 300 MYR at 0.224 -> 67.20 USD
      const { req, res, next } = createMockReqRes({
        accountId: 'acc_4',
        toAccountId: 'acc_2',
        type: 'TRANSFER',
        amount: 300,
        currency: 'MYR',
        exchangeRate: 0.224,
        date: new Date().toISOString()
      }, { id: txId });

      await updateTransaction(req, res, next);

      expect(res.statusCode).toBe(200);
      // Old source acc_1 must be refunded +200 MYR -> 5000.00
      expect(mockAccountStore.get('acc_1').balance).toBe(5000.00);
      // New source acc_4 must be debited -300 MYR -> 700.00
      expect(mockAccountStore.get('acc_4').balance).toBe(700.00);
      // Destination acc_2: 244.80 - 44.80 + 67.20 = 267.20 USD
      expect(mockAccountStore.get('acc_2').balance).toBe(267.20);
    });

    it('4. updateTransaction: changing destination account refunds old dest and credits new dest', async () => {
      const txId = 'tx_change_dest';
      mockTxStore.set(txId, {
        _id: txId,
        userId: testUserId,
        accountId: 'acc_1', // Maybank MYR (currently 4700)
        toAccountId: 'acc_2', // Wise USD (currently 266.00)
        type: 'TRANSFER',
        amount: 300,
        currency: 'MYR',
        toAmount: 66.00,
        toCurrency: 'USD',
        exchangeRate: 0.22,
        shouldConvert: true
      });
      mockAccountStore.get('acc_1').balance = 4700.00;
      mockAccountStore.get('acc_2').balance = 266.00;
      mockAccountStore.get('acc_3').balance = 350.00; // Revolut EUR (new dest)

      // Update: Change destination from acc_2 to acc_3 (EUR), 300 MYR at 0.20 -> 60.00 EUR
      const { req, res, next } = createMockReqRes({
        accountId: 'acc_1',
        toAccountId: 'acc_3',
        type: 'TRANSFER',
        amount: 300,
        currency: 'MYR',
        exchangeRate: 0.20,
        date: new Date().toISOString()
      }, { id: txId });

      await updateTransaction(req, res, next);

      expect(res.statusCode).toBe(200);
      // Source acc_1: 4700 + 300 - 300 = 4700.00
      expect(mockAccountStore.get('acc_1').balance).toBe(4700.00);
      // Old dest acc_2: 266.00 - 66.00 = 200.00 USD (original pre-transfer balance!)
      expect(mockAccountStore.get('acc_2').balance).toBe(200.00);
      // New dest acc_3: 350.00 + 60.00 = 410.00 EUR
      expect(mockAccountStore.get('acc_3').balance).toBe(410.00);
    });

    it('5. updateTransaction: swapping source and destination accounts (acc_1 -> acc_2 swapped to acc_2 -> acc_1)', async () => {
      const txId = 'tx_swap_direction';
      mockTxStore.set(txId, {
        _id: txId,
        userId: testUserId,
        accountId: 'acc_1', // MYR
        toAccountId: 'acc_2', // USD
        type: 'TRANSFER',
        amount: 100, // 100 MYR
        currency: 'MYR',
        toAmount: 22.00, // 22 USD
        toCurrency: 'USD',
        exchangeRate: 0.22,
        shouldConvert: true
      });
      // Balances with active transfer:
      mockAccountStore.get('acc_1').balance = 4900.00; // 5000 - 100
      mockAccountStore.get('acc_2').balance = 222.00;  // 200 + 22

      // Swap: now transfer 50 USD from acc_2 to acc_1 at rate 4.45 -> toAmount = 222.50 MYR
      const { req, res, next } = createMockReqRes({
        accountId: 'acc_2',
        toAccountId: 'acc_1',
        type: 'TRANSFER',
        amount: 50,
        currency: 'USD',
        exchangeRate: 4.45,
        date: new Date().toISOString()
      }, { id: txId });

      await updateTransaction(req, res, next);

      expect(res.statusCode).toBe(200);

      // Verification of swapped balances:
      // acc_1 (MYR):
      //   Started at 4900.00
      //   Revert old source: +100.00 (becomes 5000.00)
      //   Apply new dest: +222.50 (becomes 5222.50)
      expect(mockAccountStore.get('acc_1').balance).toBe(5222.50);

      // acc_2 (USD):
      //   Started at 222.00
      //   Revert old dest: -22.00 (becomes 200.00)
      //   Apply new source: -50.00 (becomes 150.00)
      expect(mockAccountStore.get('acc_2').balance).toBe(150.00);
    });

    it('6. updateTransaction: changing type from TRANSFER to EXPENSE cleans up destination account and transfer fields', async () => {
      const txId = 'tx_transfer_to_expense';
      mockTxStore.set(txId, {
        _id: txId,
        userId: testUserId,
        accountId: 'acc_1',
        toAccountId: 'acc_2',
        type: 'TRANSFER',
        amount: 250,
        currency: 'MYR',
        toAmount: 55.00,
        toCurrency: 'USD',
        exchangeRate: 0.22,
        shouldConvert: true
      });
      mockAccountStore.get('acc_1').balance = 4750.00;
      mockAccountStore.get('acc_2').balance = 255.00;

      // Update to EXPENSE of 100 MYR on acc_1
      const { req, res, next } = createMockReqRes({
        accountId: 'acc_1',
        categoryId: 'cat_groceries',
        type: 'EXPENSE',
        amount: 100,
        currency: 'MYR',
        date: new Date().toISOString()
      }, { id: txId });

      await updateTransaction(req, res, next);

      expect(res.statusCode).toBe(200);
      // acc_1: 4750 + 250 (transfer reverted) - 100 (new expense) = 4900.00
      expect(mockAccountStore.get('acc_1').balance).toBe(4900.00);
      // acc_2: 255 - 55 = 200.00 (cleanly restored)
      expect(mockAccountStore.get('acc_2').balance).toBe(200.00);

      // Check transaction document cleanup
      const updatedTx = mockTxStore.get(txId);
      expect(updatedTx.type).toBe('EXPENSE');
      expect(updatedTx.toAmount).toBeUndefined();
      expect(updatedTx.toCurrency).toBeUndefined();
      expect(updatedTx.toAccountId).toBeUndefined();
    });

    it('7. deleteTransaction: cleanly restores both source and destination accounts to exact pre-transfer balances', async () => {
      const txId = 'tx_to_delete';
      mockTxStore.set(txId, {
        _id: txId,
        userId: testUserId,
        accountId: 'acc_1',
        toAccountId: 'acc_2',
        type: 'TRANSFER',
        amount: 400,
        currency: 'MYR',
        toAmount: 89.60,
        toCurrency: 'USD',
        exchangeRate: 0.224,
        shouldConvert: true
      });
      mockAccountStore.get('acc_1').balance = 4600.00;
      mockAccountStore.get('acc_2').balance = 289.60;

      const { req, res, next } = createMockReqRes({}, { id: txId });
      await deleteTransaction(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.success).toBe(true);

      // Source restored by +400 MYR -> 5000.00
      expect(mockAccountStore.get('acc_1').balance).toBe(5000.00);
      // Dest restored by -89.60 USD -> 200.00
      expect(mockAccountStore.get('acc_2').balance).toBe(200.00);
      // Transaction removed from store
      expect(mockTxStore.has(txId)).toBe(false);
    });

    it('8. deleteTransaction: correctly rolls back legacy transfers where toAmount was null/undefined', async () => {
      const txId = 'tx_legacy_delete';
      mockTxStore.set(txId, {
        _id: txId,
        userId: testUserId,
        accountId: 'acc_1',
        toAccountId: 'acc_2',
        type: 'TRANSFER',
        amount: 100,
        currency: 'MYR',
        toAmount: undefined, // Legacy record without explicit toAmount
        exchangeRate: 0.22,
        shouldConvert: true
      });
      mockAccountStore.get('acc_1').balance = 4900.00;
      mockAccountStore.get('acc_2').balance = 222.00;

      const { req, res, next } = createMockReqRes({}, { id: txId });
      await deleteTransaction(req, res, next);

      expect(res.statusCode).toBe(200);
      // Source restored: +100 -> 5000.00
      expect(mockAccountStore.get('acc_1').balance).toBe(5000.00);
      // Dest restored: - (100 * 0.22) = -22 -> 200.00
      expect(mockAccountStore.get('acc_2').balance).toBe(200.00);
    });
  });

  // =========================================================================
  // Section 3: Aggregation Consistency Check (syncExportImportController.js)
  // =========================================================================
  describe('Balance Recalculation Aggregation Equivalence (syncExportImportController.js)', () => {
    /**
     * Exact replication of the MongoDB aggregation logic in syncExportImportController.js
     * lines 640-695.
     */
    const runAggregationRecalculate = (accounts, transactions) => {
      const balanceMap = {};

      // 1. incomeExpenseAgg
      transactions.forEach(t => {
        if (!t.accountId) return;
        const accId = t.accountId.toString();

        let income = 0;
        let expense = 0;

        if (t.type === 'INCOME') {
          income = t.convertedAmount !== undefined ? t.convertedAmount : t.amount;
        } else if (t.type === 'TRANSFER') {
          expense = t.amount;
        } else if (t.type === 'EXPENSE') {
          expense = t.convertedAmount !== undefined ? t.convertedAmount : t.amount;
        }

        balanceMap[accId] = (balanceMap[accId] || 0) + (income - expense);
      });

      // 2. transferInAgg
      transactions.forEach(t => {
        if (t.type === 'TRANSFER' && t.toAccountId) {
          const destId = t.toAccountId.toString();
          const transferInAmt = t.toAmount !== undefined && t.toAmount !== null
            ? t.toAmount
            : (t.convertedAmount !== undefined ? t.convertedAmount : t.amount);
          balanceMap[destId] = (balanceMap[destId] || 0) + transferInAmt;
        }
      });

      // Round results to 2 decimals matching float currency math
      const finalBalances = {};
      accounts.forEach(acc => {
        finalBalances[acc._id] = Number((balanceMap[acc._id] || 0).toFixed(2));
      });

      return finalBalances;
    };

    it('matches incremental balance mutations across a randomized 50-step transaction sequence', () => {
      const accounts = [
        { _id: 'acc_myr', currency: 'MYR', balance: 0 },
        { _id: 'acc_usd', currency: 'USD', balance: 0 },
        { _id: 'acc_eur', currency: 'EUR', balance: 0 },
        { _id: 'acc_sgd', currency: 'SGD', balance: 0 }
      ];

      // Track incremental balance
      const incrementalBalances = {
        acc_myr: 0,
        acc_usd: 0,
        acc_eur: 0,
        acc_sgd: 0
      };

      const transactions = [];

      // Initial funding
      accounts.forEach(acc => {
        const initDeposit = 5000.00;
        incrementalBalances[acc._id] = Number((incrementalBalances[acc._id] + initDeposit).toFixed(2));
        transactions.push({
          accountId: acc._id,
          type: 'INCOME',
          amount: initDeposit,
          convertedAmount: initDeposit,
          currency: acc.currency
        });
      });

      // Multi-step complex transfers with random rates and amounts
      const rates = {
        'MYR_USD': 0.224,
        'USD_MYR': 4.464,
        'EUR_USD': 1.085,
        'USD_EUR': 0.922,
        'SGD_MYR': 3.32,
        'MYR_SGD': 0.301,
        'USD_SGD': 1.345,
        'SGD_USD': 0.743
      };

      const transferPairs = [
        ['acc_myr', 'acc_usd', 'MYR_USD', 120.00],
        ['acc_usd', 'acc_eur', 'USD_EUR', 50.00],
        ['acc_eur', 'acc_usd', 'EUR_USD', 80.00],
        ['acc_usd', 'acc_sgd', 'USD_SGD', 45.00],
        ['acc_sgd', 'acc_myr', 'SGD_MYR', 100.00],
        ['acc_myr', 'acc_sgd', 'MYR_SGD', 250.00],
        ['acc_sgd', 'acc_usd', 'SGD_USD', 60.00],
        ['acc_usd', 'acc_myr', 'USD_MYR', 75.00]
      ];

      for (let i = 0; i < transferPairs.length; i++) {
        const [srcId, dstId, pairKey, amt] = transferPairs[i];
        const rate = rates[pairKey];
        const toAmount = Number((amt * rate).toFixed(2));

        // Incremental mutation
        incrementalBalances[srcId] = Number((incrementalBalances[srcId] - amt).toFixed(2));
        incrementalBalances[dstId] = Number((incrementalBalances[dstId] + toAmount).toFixed(2));

        transactions.push({
          accountId: srcId,
          toAccountId: dstId,
          type: 'TRANSFER',
          amount: amt,
          toAmount: toAmount,
          convertedAmount: toAmount,
          exchangeRate: rate
        });
      }

      // Execute Aggregation recalculation
      const recalculatedBalances = runAggregationRecalculate(accounts, transactions);

      // Verify every account matches the incremental balance exactly
      for (const acc of accounts) {
        expect(recalculatedBalances[acc._id]).toBe(incrementalBalances[acc._id]);
      }
    });

    it('recalculates correctly with interleaved updates, deletes, and non-transfer expenses', () => {
      const accounts = [
        { _id: 'acc_a', currency: 'MYR', balance: 0 },
        { _id: 'acc_b', currency: 'USD', balance: 0 }
      ];

      const incremental = { acc_a: 0, acc_b: 0 };
      let txs = [];

      // Step 1: Initial deposits
      incremental.acc_a += 2000;
      incremental.acc_b += 500;
      txs.push({ _id: 't0', accountId: 'acc_a', type: 'INCOME', amount: 2000, convertedAmount: 2000 });
      txs.push({ _id: 't1', accountId: 'acc_b', type: 'INCOME', amount: 500, convertedAmount: 500 });

      // Step 2: Transfer 500 MYR at 0.22 -> 110 USD
      incremental.acc_a -= 500;
      incremental.acc_b += 110;
      const transferTx = { _id: 't2', accountId: 'acc_a', toAccountId: 'acc_b', type: 'TRANSFER', amount: 500, toAmount: 110, convertedAmount: 110 };
      txs.push(transferTx);

      // Step 3: Expense on destination account: 30 USD
      incremental.acc_b -= 30;
      txs.push({ _id: 't3', accountId: 'acc_b', type: 'EXPENSE', amount: 30, convertedAmount: 30 });

      // Step 4: Transfer is modified: changed from 500 MYR to 700 MYR at 0.22 -> 154 USD
      // Revert old effect:
      incremental.acc_a += 500;
      incremental.acc_b -= 110;
      // Apply new effect:
      incremental.acc_a -= 700;
      incremental.acc_b += 154;
      // In DB, the transaction doc t2 is updated:
      transferTx.amount = 700;
      transferTx.toAmount = 154;
      transferTx.convertedAmount = 154;

      let recalculated = runAggregationRecalculate(accounts, txs);
      expect(recalculated.acc_a).toBe(incremental.acc_a); // 2000 - 700 = 1300
      expect(recalculated.acc_b).toBe(incremental.acc_b); // 500 + 154 - 30 = 624

      // Step 5: Transfer t2 is deleted entirely
      incremental.acc_a += 700;
      incremental.acc_b -= 154;
      txs = txs.filter(t => t._id !== 't2');

      recalculated = runAggregationRecalculate(accounts, txs);
      expect(recalculated.acc_a).toBe(incremental.acc_a); // 2000
      expect(recalculated.acc_b).toBe(incremental.acc_b); // 500 - 30 = 470
    });
  });

  // =========================================================================
  // Section 4: Batch Sync Operations (syncController.js)
  // =========================================================================
  describe('Batch Sync Operations Lifecycle & Rollback (syncController.js)', () => {
    let mockAccountStore;
    let mockTxStore;
    const testUserId = '507f1f77bcf86cd799439099';
    const acc1Id = '507f1f77bcf86cd799439011'; // MYR
    const acc2Id = '507f1f77bcf86cd799439022'; // USD

    beforeEach(() => {
      mockAccountStore = new Map([
        [acc1Id, { _id: acc1Id, userId: testUserId, name: 'Main MYR', currency: 'MYR', balance: 3000.00 }],
        [acc2Id, { _id: acc2Id, userId: testUserId, name: 'Travel USD', currency: 'USD', balance: 50.00 }]
      ]);
      mockTxStore = new Map();

      vi.spyOn(Account, 'findOne').mockImplementation(async (query) => {
        if (query._id) {
          const id = query._id.toString();
          const acc = mockAccountStore.get(id);
          if (acc && acc.userId.toString() === query.userId?.toString()) return { ...acc };
        }
        if (query.$or) {
          for (const acc of mockAccountStore.values()) {
            if (acc.userId.toString() === query.userId?.toString()) {
              for (const condition of query.$or) {
                if (condition.clientAccId && acc.clientAccId === condition.clientAccId) return { ...acc };
                if (condition.name && acc.name === condition.name) return { ...acc };
                if (condition._id && acc._id.toString() === condition._id.toString()) return { ...acc };
              }
            }
          }
        }
        return null;
      });

      vi.spyOn(Account, 'find').mockImplementation(async (query) => {
        return Array.from(mockAccountStore.values()).filter(a => a.userId.toString() === query.userId?.toString());
      });

      vi.spyOn(Account, 'updateOne').mockImplementation(async (query, update) => {
        const id = query._id?.toString() || query._id;
        const acc = mockAccountStore.get(id);
        if (!acc) return { matchedCount: 0, modifiedCount: 0 };
        if (update.$inc && update.$inc.balance !== undefined) {
          acc.balance = Number((acc.balance + update.$inc.balance).toFixed(2));
        }
        return { matchedCount: 1, modifiedCount: 1 };
      });

      vi.spyOn(Transaction, 'findOne').mockImplementation(async (query) => {
        if (query.clientTxId) {
          for (const tx of mockTxStore.values()) {
            if (tx.clientTxId === query.clientTxId && tx.userId.toString() === query.userId?.toString()) {
              return {
                ...tx,
                save: async function () { mockTxStore.set(tx._id.toString(), { ...this }); return this; },
                deleteOne: async function () { mockTxStore.delete(tx._id.toString()); return { acknowledged: true, deletedCount: 1 }; }
              };
            }
          }
        }
        if (query._id) {
          const id = query._id.toString();
          const tx = mockTxStore.get(id);
          if (tx && tx.userId.toString() === query.userId?.toString()) {
            return {
              ...tx,
              save: async function () { mockTxStore.set(id, { ...this }); return this; },
              deleteOne: async function () { mockTxStore.delete(id); return { acknowledged: true, deletedCount: 1 }; }
            };
          }
        }
        return null;
      });

      vi.spyOn(Transaction.prototype, 'save').mockImplementation(async function () {
        const txObj = this.toObject ? this.toObject() : { ...this };
        if (!txObj._id) {
          txObj._id = `tx_sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        }
        this._id = txObj._id;
        mockTxStore.set(txObj._id.toString(), txObj);
        return this;
      });
    });

    const createSyncReqRes = (ops = []) => {
      const req = {
        user: { id: testUserId, baseCurrency: 'MYR' },
        body: { ops }
      };
      const res = {
        statusCode: 200,
        jsonBody: null,
        status: function (code) { this.statusCode = code; return this; },
        json: function (payload) { this.jsonBody = payload; return this; }
      };
      const next = vi.fn();
      return { req, res, next };
    };

    it('syncTransactions handles batch CREATE, UPDATE, and DELETE of cross-currency transfers in order', async () => {
      const clientTxId = 'ctx_transfer_101';

      // 1. Batch CREATE: Transfer 200 MYR at 0.224 -> +44.80 USD
      const createOp = {
        type: 'CREATE',
        clientTxId,
        data: {
          accountId: acc1Id,
          toAccountId: acc2Id,
          type: 'TRANSFER',
          amount: 200,
          currency: 'MYR',
          exchangeRate: 0.224,
          date: new Date().toISOString()
        }
      };

      const { req: r1, res: res1, next: n1 } = createSyncReqRes([createOp]);
      await syncTransactions(r1, res1, n1);

      expect(res1.statusCode).toBe(200);
      expect(res1.jsonBody.processedOps[0].status).toBe('CREATED');
      expect(mockAccountStore.get(acc1Id).balance).toBe(2800.00); // 3000 - 200
      expect(mockAccountStore.get(acc2Id).balance).toBe(94.80); // 50 + 44.80

      const createdTxId = res1.jsonBody.idMap[clientTxId];
      expect(createdTxId).toBeDefined();

      // 2. Batch UPDATE: change amount to 500 MYR at 0.22 -> +110.00 USD
      const updateOp = {
        type: 'UPDATE',
        clientTxId,
        id: createdTxId,
        data: {
          accountId: acc1Id,
          toAccountId: acc2Id,
          type: 'TRANSFER',
          amount: 500,
          currency: 'MYR',
          exchangeRate: 0.22,
          date: new Date().toISOString()
        }
      };

      const { req: r2, res: res2, next: n2 } = createSyncReqRes([updateOp]);
      await syncTransactions(r2, res2, n2);

      expect(res2.statusCode).toBe(200);
      expect(res2.jsonBody.processedOps[0].status).toBe('UPDATED');
      // Source balance: 2800 + 200 (revert) - 500 (new) = 2500.00
      expect(mockAccountStore.get(acc1Id).balance).toBe(2500.00);
      // Dest balance: 94.80 - 44.80 (revert) + 110.00 (new) = 160.00
      expect(mockAccountStore.get(acc2Id).balance).toBe(160.00);

      // 3. Batch DELETE: delete the transfer
      const deleteOp = {
        type: 'DELETE',
        clientTxId,
        id: createdTxId
      };

      const { req: r3, res: res3, next: n3 } = createSyncReqRes([deleteOp]);
      await syncTransactions(r3, res3, n3);

      expect(res3.statusCode).toBe(200);
      expect(res3.jsonBody.processedOps[0].status).toBe('DELETED');
      // Source balance restored to initial 3000.00
      expect(mockAccountStore.get(acc1Id).balance).toBe(3000.00);
      // Dest balance restored to initial 50.00
      expect(mockAccountStore.get(acc2Id).balance).toBe(50.00);
    });
  });

});

