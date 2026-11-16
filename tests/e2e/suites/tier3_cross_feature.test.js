import { describe, it, expect, beforeEach } from '../harness/testHelper.js';
import { TransferSimulationEngine } from '../harness/engine.js';

describe('Tier 3: Cross-Feature Combinations Suite (Pairwise Coverage)', () => {
  let engine;

  beforeEach(() => {
    engine = new TransferSimulationEngine({ userId: 'tier3_user', baseCurrency: 'MYR' });
  });

  // =========================================================================
  // Pairwise 1: Cross-Currency Transfer + Destination Expense + Transfer Deletion
  // =========================================================================
  describe('Pairwise 1: Cross-Currency Transfer followed by Destination Expense & Deletion', () => {
    it('handles expense on destination account after incoming cross-currency transfer', () => {
      const source = engine.createAccount({ id: 'src_myr', currency: 'MYR', balance: 1000 });
      const dest = engine.createAccount({ id: 'dst_usd', currency: 'USD', balance: 20 });

      // Step 1: Transfer MYR 500 to USD at 0.22 rate -> +110 USD
      const transferTx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 500,
        exchangeRate: 0.22,
        note: 'Travel budget transfer'
      });

      expect(engine.getAccount(source._id).balance).toBe(500); // 1000 - 500
      expect(engine.getAccount(dest._id).balance).toBe(130); // 20 + 110

      // Step 2: Spend 45 USD from destination account
      const expenseTx = engine.createExpense({
        accountId: dest._id,
        amount: 45,
        currency: 'USD',
        note: 'Dinner in NY'
      });

      expect(engine.getAccount(dest._id).balance).toBe(85); // 130 - 45

      // Step 3: Delete initial transfer; verify source restored and dest decremented by transfer amount
      engine.deleteTransaction(transferTx._id);

      expect(engine.getAccount(source._id).balance).toBe(1000); // restored
      expect(engine.getAccount(dest._id).balance).toBe(-25); // 85 - 110 = -25 (overdrawn because 45 was spent from 20)
    });

    it('verifies ledger integrity across transfer and subsequent expenses', () => {
      const s = engine.createAccount({ id: 's_eur', currency: 'EUR', balance: 500 });
      const d = engine.createAccount({ id: 'd_gbp', currency: 'GBP', balance: 0 });

      engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 200,
        exchangeRate: 0.85
      }); // +170 GBP

      engine.createExpense({ accountId: d._id, amount: 30, note: 'Train ticket' });
      engine.createExpense({ accountId: d._id, amount: 20, note: 'Lunch' });

      const ledger = engine.getAccountLedger(d._id).ledger;
      expect(ledger.length).toBe(3);
      expect(ledger.filter(l => l.flow === 'INFLOW').length).toBe(1);
      expect(ledger.filter(l => l.flow === 'OUTFLOW').length).toBe(2);
      expect(engine.getAccount(d._id).balance).toBe(120); // 170 - 50
    });
  });

  // =========================================================================
  // Pairwise 2: Multi-Hop Cross-Currency Transfers (MYR -> USD -> EUR)
  // =========================================================================
  describe('Pairwise 2: Multi-Hop Cross-Currency Transfers (Chain Conversion)', () => {
    it('executes 3-currency chain transfer (MYR -> USD -> EUR) with balance integrity', () => {
      const myrAcc = engine.createAccount({ id: 'hop_myr', currency: 'MYR', balance: 1000 });
      const usdAcc = engine.createAccount({ id: 'hop_usd', currency: 'USD', balance: 50 });
      const eurAcc = engine.createAccount({ id: 'hop_eur', currency: 'EUR', balance: 10 });

      // Hop 1: MYR 500 to USD at 0.22 -> +110 USD
      const hop1 = engine.createTransfer({
        accountId: myrAcc._id,
        toAccountId: usdAcc._id,
        amount: 500,
        exchangeRate: 0.22
      });

      expect(engine.getAccount(myrAcc._id).balance).toBe(500);
      expect(engine.getAccount(usdAcc._id).balance).toBe(160); // 50 + 110

      // Hop 2: USD 100 to EUR at 0.92 -> +92 EUR
      const hop2 = engine.createTransfer({
        accountId: usdAcc._id,
        toAccountId: eurAcc._id,
        amount: 100,
        exchangeRate: 0.92
      });

      expect(engine.getAccount(usdAcc._id).balance).toBe(60); // 160 - 100
      expect(engine.getAccount(eurAcc._id).balance).toBe(102); // 10 + 92

      // Rollback Hop 2
      engine.deleteTransaction(hop2._id);
      expect(engine.getAccount(usdAcc._id).balance).toBe(160);
      expect(engine.getAccount(eurAcc._id).balance).toBe(10);

      // Rollback Hop 1
      engine.deleteTransaction(hop1._id);
      expect(engine.getAccount(myrAcc._id).balance).toBe(1000);
      expect(engine.getAccount(usdAcc._id).balance).toBe(50);
    });

    it('handles 4-currency closed loop rebalancing', () => {
      const a = engine.createAccount({ id: 'c_usd', currency: 'USD', balance: 1000 });
      const b = engine.createAccount({ id: 'c_eur', currency: 'EUR', balance: 0 });
      const c = engine.createAccount({ id: 'c_gbp', currency: 'GBP', balance: 0 });
      const d = engine.createAccount({ id: 'c_jpy', currency: 'JPY', balance: 0 });

      // USD 200 -> EUR at 0.90 -> +180 EUR
      engine.createTransfer({ accountId: a._id, toAccountId: b._id, amount: 200, exchangeRate: 0.90 });
      // EUR 100 -> GBP at 0.85 -> +85 GBP
      engine.createTransfer({ accountId: b._id, toAccountId: c._id, amount: 100, exchangeRate: 0.85 });
      // GBP 50 -> JPY at 195 -> +9750 JPY
      engine.createTransfer({ accountId: c._id, toAccountId: d._id, amount: 50, exchangeRate: 195.00 });

      expect(engine.getAccount(a._id).balance).toBe(800);
      expect(engine.getAccount(b._id).balance).toBe(80); // 180 - 100
      expect(engine.getAccount(c._id).balance).toBe(35); // 85 - 50
      expect(engine.getAccount(d._id).balance).toBe(9750);
    });
  });

  // =========================================================================
  // Pairwise 3: Cross-Currency Transfer Modified Then Deleted
  // =========================================================================
  describe('Pairwise 3: Cross-Currency Transfer Modified Then Deleted', () => {
    it('creates, modifies amount and rate twice, then deletes cleanly', () => {
      const s = engine.createAccount({ id: 'mod_s', currency: 'MYR', balance: 1000 });
      const d = engine.createAccount({ id: 'mod_d', currency: 'USD', balance: 100 });

      // 1. Initial creation: 100 MYR at 0.22 -> 22 USD
      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 100,
        exchangeRate: 0.22
      });
      expect(engine.getAccount(s._id).balance).toBe(900);
      expect(engine.getAccount(d._id).balance).toBe(122);

      // 2. Modify amount to 300 MYR (rate still 0.22 -> 66 USD)
      engine.updateTransfer(tx._id, { amount: 300 });
      expect(engine.getAccount(s._id).balance).toBe(700);
      expect(engine.getAccount(d._id).balance).toBe(166);

      // 3. Modify rate to 0.24 (300 * 0.24 = 72 USD)
      engine.updateTransfer(tx._id, { exchangeRate: 0.24 });
      expect(engine.getAccount(s._id).balance).toBe(700);
      expect(engine.getAccount(d._id).balance).toBe(172);

      // 4. Delete the modified transfer
      engine.deleteTransaction(tx._id);

      // Verify exact pre-transfer state
      expect(engine.getAccount(s._id).balance).toBe(1000);
      expect(engine.getAccount(d._id).balance).toBe(100);
    });
  });

  // =========================================================================
  // Pairwise 4: Offline Queued Cross-Currency Transfer Synced with Live Changes
  // =========================================================================
  describe('Pairwise 4: Offline Queued Cross-Currency Transfer Synced with Concurrent Live Updates', () => {
    it('reconciles offline queued transfers against concurrent online income and expenses', () => {
      const s = engine.createAccount({ id: 'co_s', currency: 'MYR', balance: 2000 });
      const d = engine.createAccount({ id: 'co_d', currency: 'USD', balance: 500 });

      // Concurrent live event on server: Salary deposited into source account
      engine.createIncome({ accountId: s._id, amount: 3000, note: 'Salary' });
      expect(engine.getAccount(s._id).balance).toBe(5000);

      // Concurrent live event on server: Direct expense on dest account
      engine.createExpense({ accountId: d._id, amount: 150, note: 'Groceries' });
      expect(engine.getAccount(d._id).balance).toBe(350);

      // Client comes online with offline batch:
      // Op 1: Transfer MYR 1000 to USD at 0.22 -> +220 USD
      // Op 2: Transfer MYR 500 to USD at 0.225 -> +112.50 USD
      const syncResult = engine.syncBatch([
        {
          type: 'CREATE',
          clientTxId: 'cl_sync_cross_1',
          data: { accountId: s._id, toAccountId: d._id, amount: 1000, exchangeRate: 0.22 }
        },
        {
          type: 'CREATE',
          clientTxId: 'cl_sync_cross_2',
          data: { accountId: s._id, toAccountId: d._id, amount: 500, exchangeRate: 0.225 }
        }
      ]);

      expect(syncResult.success).toBe(true);
      expect(syncResult.processedOps.length).toBe(2);

      // Source balance: 5000 - 1000 - 500 = 3500
      expect(engine.getAccount(s._id).balance).toBe(3500);

      // Dest balance: 350 + 220 + 112.50 = 682.50
      expect(engine.getAccount(d._id).balance).toBe(682.50);
    });

    it('syncs offline batch containing interdependent transfer, update, and deletion', () => {
      const s = engine.createAccount({ id: 'dep_s', currency: 'USD', balance: 1000 });
      const d = engine.createAccount({ id: 'dep_d', currency: 'EUR', balance: 200 });

      const syncResult = engine.syncBatch([
        // Step 1: Create transfer 200 USD -> EUR at 0.90 (+180 EUR)
        {
          type: 'CREATE',
          clientTxId: 'dep_tx_1',
          data: { accountId: s._id, toAccountId: d._id, amount: 200, exchangeRate: 0.90 }
        },
        // Step 2: Create second transfer 100 USD -> EUR at 0.90 (+90 EUR)
        {
          type: 'CREATE',
          clientTxId: 'dep_tx_2',
          data: { accountId: s._id, toAccountId: d._id, amount: 100, exchangeRate: 0.90 }
        },
        // Step 3: Update first transfer to 300 USD (+270 EUR)
        {
          type: 'UPDATE',
          clientTxId: 'dep_tx_1',
          data: { amount: 300, exchangeRate: 0.90 }
        },
        // Step 4: Delete second transfer
        {
          type: 'DELETE',
          clientTxId: 'dep_tx_2'
        }
      ]);

      expect(syncResult.success).toBe(true);

      // Net effect: Only updated tx 1 remains (300 USD -> 270 EUR)
      // Source: 1000 - 300 = 700 USD
      // Dest: 200 + 270 = 470 EUR
      expect(engine.getAccount(s._id).balance).toBe(700);
      expect(engine.getAccount(d._id).balance).toBe(470);
    });
  });

  // =========================================================================
  // Pairwise 5: High-Frequency Interleaved Transaction Flow
  // =========================================================================
  describe('Pairwise 5: Interleaved Mixed Flow (Transfers, Inflows, Outflows)', () => {
    it('maintains strict conservation of funds across 10 rapid mixed operations', () => {
      const accUSD = engine.createAccount({ id: 'mix_usd', currency: 'USD', balance: 1000 });
      const accEUR = engine.createAccount({ id: 'mix_eur', currency: 'EUR', balance: 1000 });

      // Run interleaved operations
      engine.createTransfer({ accountId: accUSD._id, toAccountId: accEUR._id, amount: 100, exchangeRate: 0.92 }); // USD -100 (900), EUR +92 (1092)
      engine.createIncome({ accountId: accUSD._id, amount: 50 }); // USD +50 (950)
      engine.createExpense({ accountId: accEUR._id, amount: 20 }); // EUR -20 (1072)
      engine.createTransfer({ accountId: accEUR._id, toAccountId: accUSD._id, amount: 50, exchangeRate: 1.08 }); // EUR -50 (1022), USD +54 (1004)
      engine.createExpense({ accountId: accUSD._id, amount: 4 }); // USD -4 (1000)

      expect(engine.getAccount(accUSD._id).balance).toBe(1000);
      expect(engine.getAccount(accEUR._id).balance).toBe(1022);
    });
  });
});
