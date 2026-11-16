import { describe, it, expect, beforeEach } from '../harness/testHelper.js';
import { TransferSimulationEngine } from '../harness/engine.js';

describe('Tier 1: Feature Coverage Suite', () => {
  let engine;

  beforeEach(() => {
    engine = new TransferSimulationEngine({ userId: 'tier1_user', baseCurrency: 'MYR' });
  });

  // ==========================================
  // Feature 1: Same-Currency Account Transfer
  // ==========================================
  describe('Feature 1: Same-Currency Account Transfer', () => {
    it('executes standard same-currency transfer between two MYR accounts', () => {
      const source = engine.createAccount({ id: 'myr_cash', currency: 'MYR', balance: 500 });
      const dest = engine.createAccount({ id: 'myr_savings', currency: 'MYR', balance: 1000 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 150
      });

      expect(tx.amount).toBe(150);
      expect(tx.toAmount).toBe(150);
      expect(tx.exchangeRate).toBe(1.0);
      expect(engine.getAccount(source._id).balance).toBe(350);
      expect(engine.getAccount(dest._id).balance).toBe(1150);
    });

    it('executes exact balance transfer reducing source to zero', () => {
      const source = engine.createAccount({ id: 'myr_exact', currency: 'MYR', balance: 250.75 });
      const dest = engine.createAccount({ id: 'myr_dest', currency: 'MYR', balance: 0 });

      engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 250.75
      });

      expect(engine.getAccount(source._id).balance).toBe(0.00);
      expect(engine.getAccount(dest._id).balance).toBe(250.75);
    });

    it('handles small fractional amount transfers in same currency', () => {
      const source = engine.createAccount({ id: 'usd_1', currency: 'USD', balance: 10.00 });
      const dest = engine.createAccount({ id: 'usd_2', currency: 'USD', balance: 5.00 });

      engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 0.05
      });

      expect(engine.getAccount(source._id).balance).toBe(9.95);
      expect(engine.getAccount(dest._id).balance).toBe(5.05);
    });

    it('persists metadata (note, description, date) alongside same-currency transfer', () => {
      const source = engine.createAccount({ id: 'eur_1', currency: 'EUR', balance: 100 });
      const dest = engine.createAccount({ id: 'eur_2', currency: 'EUR', balance: 50 });

      const customDate = '2026-11-15T12:00:00.000Z';
      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 25,
        note: 'Monthly allowance',
        description: 'Transferred via Mobile App',
        date: customDate
      });

      expect(tx.note).toBe('Monthly allowance');
      expect(tx.description).toBe('Transferred via Mobile App');
      expect(tx.date).toBe(customDate);
      expect(tx.toCurrency).toBe('EUR');
    });

    it('supports multi-step daisy-chain transfer across three same-currency accounts', () => {
      const accA = engine.createAccount({ id: 'chain_a', currency: 'GBP', balance: 300 });
      const accB = engine.createAccount({ id: 'chain_b', currency: 'GBP', balance: 100 });
      const accC = engine.createAccount({ id: 'chain_c', currency: 'GBP', balance: 50 });

      // Step 1: A -> B 100
      engine.createTransfer({ accountId: accA._id, toAccountId: accB._id, amount: 100 });
      // Step 2: B -> C 80
      engine.createTransfer({ accountId: accB._id, toAccountId: accC._id, amount: 80 });

      expect(engine.getAccount(accA._id).balance).toBe(200);
      expect(engine.getAccount(accB._id).balance).toBe(120);
      expect(engine.getAccount(accC._id).balance).toBe(130);
    });
  });

  // ============================================================
  // Feature 2: Cross-Currency Account Transfer (MYR -> USD)
  // ============================================================
  describe('Feature 2: Cross-Currency Account Transfer (MYR -> USD)', () => {
    it('converts MYR 50 to USD at 0.22 exchange rate correctly (User Request Case)', () => {
      const source = engine.createAccount({ id: 'myr_acc', currency: 'MYR', balance: 500 });
      const dest = engine.createAccount({ id: 'usd_acc', currency: 'USD', balance: 0 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 50,
        exchangeRate: 0.22
      });

      expect(tx.amount).toBe(50);
      expect(tx.currency).toBe('MYR');
      expect(tx.toAmount).toBe(11.00);
      expect(tx.toCurrency).toBe('USD');
      expect(engine.getAccount(source._id).balance).toBe(450.00);
      expect(engine.getAccount(dest._id).balance).toBe(11.00);
    });

    it('converts MYR 100 to USD at 0.215 rate with fractional cents precision', () => {
      const source = engine.createAccount({ id: 'myr_acc_2', currency: 'MYR', balance: 200 });
      const dest = engine.createAccount({ id: 'usd_acc_2', currency: 'USD', balance: 50 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 100,
        exchangeRate: 0.215
      });

      expect(tx.toAmount).toBe(21.50);
      expect(engine.getAccount(source._id).balance).toBe(100.00);
      expect(engine.getAccount(dest._id).balance).toBe(71.50);
    });

    it('honors explicitly specified toAmount over raw rate calculation', () => {
      const source = engine.createAccount({ id: 'myr_spec', currency: 'MYR', balance: 1000 });
      const dest = engine.createAccount({ id: 'usd_spec', currency: 'USD', balance: 100 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 250,
        toAmount: 55.00
      });

      expect(tx.toAmount).toBe(55.00);
      expect(engine.getAccount(source._id).balance).toBe(750.00);
      expect(engine.getAccount(dest._id).balance).toBe(155.00);
    });

    it('handles high amount conversion MYR 10,000 to USD at 0.224 rate', () => {
      const source = engine.createAccount({ id: 'myr_high', currency: 'MYR', balance: 20000 });
      const dest = engine.createAccount({ id: 'usd_high', currency: 'USD', balance: 5000 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 10000,
        exchangeRate: 0.224
      });

      expect(tx.toAmount).toBe(2240.00);
      expect(engine.getAccount(source._id).balance).toBe(10000.00);
      expect(engine.getAccount(dest._id).balance).toBe(7240.00);
    });

    it('handles small amount conversion MYR 5 to USD at 0.22 rate', () => {
      const source = engine.createAccount({ id: 'myr_small', currency: 'MYR', balance: 50 });
      const dest = engine.createAccount({ id: 'usd_small', currency: 'USD', balance: 10 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 5,
        exchangeRate: 0.22
      });

      expect(tx.toAmount).toBe(1.10);
      expect(engine.getAccount(source._id).balance).toBe(45.00);
      expect(engine.getAccount(dest._id).balance).toBe(11.10);
    });
  });

  // ====================================================================
  // Feature 3: Cross-Currency Account Transfer (Other Currency Pairs)
  // ====================================================================
  describe('Feature 3: Cross-Currency Account Transfer (Other Pairs)', () => {
    it('converts USD to EUR at 0.92 rate', () => {
      const source = engine.createAccount({ id: 'usd_acc', currency: 'USD', balance: 1000 });
      const dest = engine.createAccount({ id: 'eur_acc', currency: 'EUR', balance: 200 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 100,
        exchangeRate: 0.92
      });

      expect(tx.toAmount).toBe(92.00);
      expect(engine.getAccount(source._id).balance).toBe(900.00);
      expect(engine.getAccount(dest._id).balance).toBe(292.00);
    });

    it('converts EUR to GBP at 0.85 rate', () => {
      const source = engine.createAccount({ id: 'eur_acc', currency: 'EUR', balance: 500 });
      const dest = engine.createAccount({ id: 'gbp_acc', currency: 'GBP', balance: 100 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 200,
        exchangeRate: 0.85
      });

      expect(tx.toAmount).toBe(170.00);
      expect(engine.getAccount(source._id).balance).toBe(300.00);
      expect(engine.getAccount(dest._id).balance).toBe(270.00);
    });

    it('converts USD to JPY at 155.00 rate', () => {
      const source = engine.createAccount({ id: 'usd_acc', currency: 'USD', balance: 300 });
      const dest = engine.createAccount({ id: 'jpy_acc', currency: 'JPY', balance: 10000 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 50,
        exchangeRate: 155.00
      });

      expect(tx.toAmount).toBe(7750.00);
      expect(engine.getAccount(source._id).balance).toBe(250.00);
      expect(engine.getAccount(dest._id).balance).toBe(17750.00);
    });

    it('converts SGD to MYR at 3.32 rate', () => {
      const source = engine.createAccount({ id: 'sgd_acc', currency: 'SGD', balance: 400 });
      const dest = engine.createAccount({ id: 'myr_acc', currency: 'MYR', balance: 1000 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 150,
        exchangeRate: 3.32
      });

      expect(tx.toAmount).toBe(498.00);
      expect(engine.getAccount(source._id).balance).toBe(250.00);
      expect(engine.getAccount(dest._id).balance).toBe(1498.00);
    });

    it('converts GBP to EUR at 1.18 rate', () => {
      const source = engine.createAccount({ id: 'gbp_acc', currency: 'GBP', balance: 250 });
      const dest = engine.createAccount({ id: 'eur_acc', currency: 'EUR', balance: 300 });

      const tx = engine.createTransfer({
        accountId: source._id,
        toAccountId: dest._id,
        amount: 75,
        exchangeRate: 1.18
      });

      expect(tx.toAmount).toBe(88.50);
      expect(engine.getAccount(source._id).balance).toBe(175.00);
      expect(engine.getAccount(dest._id).balance).toBe(388.50);
    });
  });

  // =========================================================================
  // Feature 4: Destination Account Credit Calculation (amount * rate / toAmount)
  // =========================================================================
  describe('Feature 4: Destination Account Credit Calculation', () => {
    it('uses provided toAmount directly when explicitly supplied', () => {
      const s = engine.createAccount({ id: 's1', currency: 'USD', balance: 500 });
      const d = engine.createAccount({ id: 'd1', currency: 'EUR', balance: 100 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 100,
        toAmount: 91.50
      });

      expect(tx.toAmount).toBe(91.50);
      expect(engine.getAccount(d._id).balance).toBe(191.50);
    });

    it('calculates credit based on rate multiplication when toAmount not given', () => {
      const s = engine.createAccount({ id: 's2', currency: 'EUR', balance: 500 });
      const d = engine.createAccount({ id: 'd2', currency: 'USD', balance: 100 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 80,
        exchangeRate: 1.085
      });

      expect(tx.toAmount).toBe(86.80);
      expect(engine.getAccount(d._id).balance).toBe(186.80);
    });

    it('correctly rounds credit amount for fractional product (e.g. 33.33 * 0.22 -> 7.33)', () => {
      const s = engine.createAccount({ id: 's3', currency: 'MYR', balance: 100 });
      const d = engine.createAccount({ id: 'd3', currency: 'USD', balance: 0 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 33.33,
        exchangeRate: 0.22
      });

      expect(tx.toAmount).toBe(7.33);
      expect(engine.getAccount(d._id).balance).toBe(7.33);
    });

    it('calculates credit correctly with high rate multiplication (>100)', () => {
      const s = engine.createAccount({ id: 's4', currency: 'EUR', balance: 100 });
      const d = engine.createAccount({ id: 'd4', currency: 'JPY', balance: 0 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 40,
        exchangeRate: 162.75
      });

      expect(tx.toAmount).toBe(6510.00);
      expect(engine.getAccount(d._id).balance).toBe(6510.00);
    });

    it('calculates credit correctly with fractional sub-cent rate (<0.01)', () => {
      const s = engine.createAccount({ id: 's5', currency: 'JPY', balance: 50000 });
      const d = engine.createAccount({ id: 'd5', currency: 'USD', balance: 0 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 10000,
        exchangeRate: 0.00645
      });

      expect(tx.toAmount).toBe(64.50);
      expect(engine.getAccount(d._id).balance).toBe(64.50);
    });
  });

  // =========================================================================
  // Feature 5: Source Account Debit Calculation
  // =========================================================================
  describe('Feature 5: Source Account Debit Calculation', () => {
    it('debits source account strictly in source currency regardless of destination currency', () => {
      const s = engine.createAccount({ id: 'src_1', currency: 'MYR', balance: 600 });
      const d = engine.createAccount({ id: 'dst_1', currency: 'EUR', balance: 0 });

      engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 200,
        exchangeRate: 0.20
      });

      expect(engine.getAccount(s._id).balance).toBe(400.00);
    });

    it('guarantees source debit does not vary when exchange rate changes', () => {
      const s = engine.createAccount({ id: 'src_2', currency: 'USD', balance: 1000 });
      const d = engine.createAccount({ id: 'dst_2', currency: 'JPY', balance: 0 });

      engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 100,
        exchangeRate: 155.00
      });

      expect(engine.getAccount(s._id).balance).toBe(900.00);
    });

    it('correctly debits integer amounts without precision drift', () => {
      const s = engine.createAccount({ id: 'src_3', currency: 'GBP', balance: 500 });
      const d = engine.createAccount({ id: 'dst_3', currency: 'USD', balance: 50 });

      engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 150,
        exchangeRate: 1.25
      });

      expect(engine.getAccount(s._id).balance).toBe(350.00);
    });

    it('correctly debits floating cents amounts (e.g. 49.99)', () => {
      const s = engine.createAccount({ id: 'src_4', currency: 'USD', balance: 100.00 });
      const d = engine.createAccount({ id: 'dst_4', currency: 'EUR', balance: 0 });

      engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 49.99,
        exchangeRate: 0.92
      });

      expect(engine.getAccount(s._id).balance).toBe(50.01);
    });

    it('allows negative balance debit when transferring beyond current funds', () => {
      const s = engine.createAccount({ id: 'src_5', currency: 'USD', balance: 50.00 });
      const d = engine.createAccount({ id: 'dst_5', currency: 'USD', balance: 0 });

      engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 80.00
      });

      expect(engine.getAccount(s._id).balance).toBe(-30.00);
      expect(engine.getAccount(d._id).balance).toBe(80.00);
    });
  });

  // =========================================================================
  // Feature 6: Cross-Currency Transfer Reversion on Delete
  // =========================================================================
  describe('Feature 6: Cross-Currency Transfer Reversion on Delete', () => {
    it('restores exact source and destination balances on same-currency deletion', () => {
      const s = engine.createAccount({ id: 'del_s1', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'del_d1', currency: 'MYR', balance: 100 });

      const tx = engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 150 });
      expect(engine.getAccount(s._id).balance).toBe(350);
      expect(engine.getAccount(d._id).balance).toBe(250);

      engine.deleteTransaction(tx._id);
      expect(engine.getAccount(s._id).balance).toBe(500);
      expect(engine.getAccount(d._id).balance).toBe(100);
    });

    it('restores cross-currency balances (adds back source amount, subtracts toAmount from dest)', () => {
      const s = engine.createAccount({ id: 'del_s2', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'del_d2', currency: 'USD', balance: 100 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 100,
        exchangeRate: 0.22
      });
      expect(engine.getAccount(s._id).balance).toBe(400);
      expect(engine.getAccount(d._id).balance).toBe(122);

      engine.deleteTransaction(tx._id);
      expect(engine.getAccount(s._id).balance).toBe(500);
      expect(engine.getAccount(d._id).balance).toBe(100);
    });

    it('restores balances when transfer used explicit toAmount', () => {
      const s = engine.createAccount({ id: 'del_s3', currency: 'EUR', balance: 300 });
      const d = engine.createAccount({ id: 'del_d3', currency: 'GBP', balance: 50 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 120,
        toAmount: 102.50
      });
      expect(engine.getAccount(s._id).balance).toBe(180);
      expect(engine.getAccount(d._id).balance).toBe(152.50);

      engine.deleteTransaction(tx._id);
      expect(engine.getAccount(s._id).balance).toBe(300);
      expect(engine.getAccount(d._id).balance).toBe(50);
    });

    it('correctly reverts balances after intermediate transactions on destination account', () => {
      const s = engine.createAccount({ id: 'del_s4', currency: 'USD', balance: 400 });
      const d = engine.createAccount({ id: 'del_d4', currency: 'EUR', balance: 50 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 100,
        exchangeRate: 0.90
      });
      // d has 50 + 90 = 140
      // Intermediate income on dest: +30
      engine.createIncome({ accountId: d._id, amount: 30 });
      expect(engine.getAccount(d._id).balance).toBe(170);

      // Now delete transfer: should subtract 90 from d and add 100 to s
      engine.deleteTransaction(tx._id);
      expect(engine.getAccount(s._id).balance).toBe(400);
      expect(engine.getAccount(d._id).balance).toBe(80); // 170 - 90 = 80 (initial 50 + 30 income)
    });

    it('handles sequential deletion of multiple transfers without state corruption', () => {
      const s = engine.createAccount({ id: 'del_s5', currency: 'USD', balance: 1000 });
      const d = engine.createAccount({ id: 'del_d5', currency: 'CAD', balance: 100 });

      const tx1 = engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 100, exchangeRate: 1.35 });
      const tx2 = engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 200, exchangeRate: 1.36 });

      expect(engine.getAccount(s._id).balance).toBe(700);
      expect(engine.getAccount(d._id).balance).toBe(507); // 100 + 135 + 272

      engine.deleteTransaction(tx2._id);
      expect(engine.getAccount(s._id).balance).toBe(900);
      expect(engine.getAccount(d._id).balance).toBe(235);

      engine.deleteTransaction(tx1._id);
      expect(engine.getAccount(s._id).balance).toBe(1000);
      expect(engine.getAccount(d._id).balance).toBe(100);
    });
  });

  // =========================================================================
  // Feature 7: Transfer Update Balance Adjustments
  // =========================================================================
  describe('Feature 7: Transfer Update Balance Adjustments', () => {
    it('adjusts balances when modifying transfer amount', () => {
      const s = engine.createAccount({ id: 'up_s1', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'up_d1', currency: 'USD', balance: 50 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 100,
        exchangeRate: 0.22
      });
      // s: 400, d: 72 (50 + 22)
      expect(engine.getAccount(s._id).balance).toBe(400);
      expect(engine.getAccount(d._id).balance).toBe(72);

      // Update amount to 200 at same rate
      engine.updateTransfer(tx._id, { amount: 200 });

      // s: 500 - 200 = 300, d: 50 + 44 = 94
      expect(engine.getAccount(s._id).balance).toBe(300);
      expect(engine.getAccount(d._id).balance).toBe(94);
    });

    it('adjusts destination balance when modifying exchange rate', () => {
      const s = engine.createAccount({ id: 'up_s2', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'up_d2', currency: 'USD', balance: 50 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 100,
        exchangeRate: 0.20
      });
      expect(engine.getAccount(d._id).balance).toBe(70);

      // Update rate to 0.23
      engine.updateTransfer(tx._id, { exchangeRate: 0.23 });

      expect(engine.getAccount(s._id).balance).toBe(400); // source unaffected
      expect(engine.getAccount(d._id).balance).toBe(73); // 50 + 23
    });

    it('re-routes funds when changing destination account', () => {
      const s = engine.createAccount({ id: 'up_s3', currency: 'USD', balance: 500 });
      const dOld = engine.createAccount({ id: 'up_d3_old', currency: 'USD', balance: 100 });
      const dNew = engine.createAccount({ id: 'up_d3_new', currency: 'USD', balance: 50 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: dOld._id,
        amount: 80
      });
      expect(engine.getAccount(dOld._id).balance).toBe(180);
      expect(engine.getAccount(dNew._id).balance).toBe(50);

      // Update destination to dNew
      engine.updateTransfer(tx._id, { toAccountId: dNew._id });

      expect(engine.getAccount(s._id).balance).toBe(420);
      expect(engine.getAccount(dOld._id).balance).toBe(100); // old dest restored
      expect(engine.getAccount(dNew._id).balance).toBe(130); // new dest credited
    });

    it('transitions transfer from same-currency to cross-currency on account change', () => {
      const s = engine.createAccount({ id: 'up_s4', currency: 'MYR', balance: 600 });
      const dSame = engine.createAccount({ id: 'up_d4_same', currency: 'MYR', balance: 200 });
      const dCross = engine.createAccount({ id: 'up_d4_cross', currency: 'USD', balance: 50 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: dSame._id,
        amount: 100
      });

      // Change destination to dCross (USD) with rate 0.22
      engine.updateTransfer(tx._id, {
        toAccountId: dCross._id,
        exchangeRate: 0.22
      });

      expect(engine.getAccount(s._id).balance).toBe(500);
      expect(engine.getAccount(dSame._id).balance).toBe(200); // restored
      expect(engine.getAccount(dCross._id).balance).toBe(72); // 50 + 22
    });

    it('updates transfer non-financial metadata without balance drift', () => {
      const s = engine.createAccount({ id: 'up_s5', currency: 'USD', balance: 300 });
      const d = engine.createAccount({ id: 'up_d5', currency: 'USD', balance: 100 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 50,
        note: 'Old note'
      });

      const updated = engine.updateTransfer(tx._id, {
        note: 'New updated note',
        description: 'New detailed description'
      });

      expect(updated.note).toBe('New updated note');
      expect(updated.description).toBe('New detailed description');
      expect(engine.getAccount(s._id).balance).toBe(250);
      expect(engine.getAccount(d._id).balance).toBe(150);
    });
  });

  // =========================================================================
  // Feature 8: Offline Batch Sync of Cross-Currency Transfer
  // =========================================================================
  describe('Feature 8: Offline Batch Sync of Cross-Currency Transfer', () => {
    it('syncs single offline CREATE transfer operation', () => {
      const s = engine.createAccount({ id: 'sync_s1', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'sync_d1', currency: 'USD', balance: 100 });

      const res = engine.syncBatch([
        {
          type: 'CREATE',
          clientTxId: 'cl_tx_101',
          data: {
            accountId: s._id,
            toAccountId: d._id,
            amount: 100,
            exchangeRate: 0.22
          }
        }
      ]);

      expect(res.success).toBe(true);
      expect(res.processedOps[0].status).toBe('CREATED');
      expect(engine.getAccount(s._id).balance).toBe(400);
      expect(engine.getAccount(d._id).balance).toBe(122);
    });

    it('processes multiple chronological offline CREATE operations', () => {
      const s = engine.createAccount({ id: 'sync_s2', currency: 'EUR', balance: 1000 });
      const d = engine.createAccount({ id: 'sync_d2', currency: 'USD', balance: 200 });

      const res = engine.syncBatch([
        {
          type: 'CREATE',
          clientTxId: 'cl_batch_1',
          data: { accountId: s._id, toAccountId: d._id, amount: 200, exchangeRate: 1.08 }
        },
        {
          type: 'CREATE',
          clientTxId: 'cl_batch_2',
          data: { accountId: s._id, toAccountId: d._id, amount: 300, exchangeRate: 1.09 }
        }
      ]);

      expect(res.processedOps.length).toBe(2);
      expect(engine.getAccount(s._id).balance).toBe(500); // 1000 - 200 - 300
      expect(engine.getAccount(d._id).balance).toBe(743); // 200 + 216 + 327
    });

    it('enforces idempotency on duplicate clientTxId to prevent double balance deduction', () => {
      const s = engine.createAccount({ id: 'sync_s3', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'sync_d3', currency: 'USD', balance: 100 });

      // First batch
      engine.syncBatch([
        {
          type: 'CREATE',
          clientTxId: 'cl_idemp_1',
          data: { accountId: s._id, toAccountId: d._id, amount: 50, exchangeRate: 0.22 }
        }
      ]);
      expect(engine.getAccount(s._id).balance).toBe(450);
      expect(engine.getAccount(d._id).balance).toBe(111);

      // Second batch with SAME clientTxId
      const replayRes = engine.syncBatch([
        {
          type: 'CREATE',
          clientTxId: 'cl_idemp_1',
          data: { accountId: s._id, toAccountId: d._id, amount: 50, exchangeRate: 0.22 }
        }
      ]);

      expect(replayRes.processedOps[0].status).toBe('SKIPPED_DUPLICATE');
      expect(engine.getAccount(s._id).balance).toBe(450); // unchanged
      expect(engine.getAccount(d._id).balance).toBe(111); // unchanged
    });

    it('syncs offline UPDATE operation reconciling server balance', () => {
      const s = engine.createAccount({ id: 'sync_s4', currency: 'MYR', balance: 600 });
      const d = engine.createAccount({ id: 'sync_d4', currency: 'USD', balance: 100 });

      // Initially created
      const createRes = engine.syncBatch([
        {
          type: 'CREATE',
          clientTxId: 'cl_update_target',
          data: { accountId: s._id, toAccountId: d._id, amount: 100, exchangeRate: 0.22 }
        }
      ]);
      const txId = createRes.processedOps[0].id;

      // Now sync UPDATE
      const updateRes = engine.syncBatch([
        {
          type: 'UPDATE',
          id: txId,
          data: { amount: 150, exchangeRate: 0.22 }
        }
      ]);

      expect(updateRes.processedOps[0].status).toBe('UPDATED');
      expect(engine.getAccount(s._id).balance).toBe(450); // 600 - 150
      expect(engine.getAccount(d._id).balance).toBe(133); // 100 + 33
    });

    it('syncs offline DELETE operation cleanly restoring balances', () => {
      const s = engine.createAccount({ id: 'sync_s5', currency: 'USD', balance: 500 });
      const d = engine.createAccount({ id: 'sync_d5', currency: 'CAD', balance: 100 });

      const createRes = engine.syncBatch([
        {
          type: 'CREATE',
          clientTxId: 'cl_delete_target',
          data: { accountId: s._id, toAccountId: d._id, amount: 100, exchangeRate: 1.35 }
        }
      ]);
      const txId = createRes.processedOps[0].id;
      expect(engine.getAccount(s._id).balance).toBe(400);
      expect(engine.getAccount(d._id).balance).toBe(235);

      const deleteRes = engine.syncBatch([
        {
          type: 'DELETE',
          id: txId
        }
      ]);

      expect(deleteRes.processedOps[0].status).toBe('DELETED');
      expect(engine.getAccount(s._id).balance).toBe(500);
      expect(engine.getAccount(d._id).balance).toBe(100);
    });
  });

  // =========================================================================
  // Feature 9: Destination Account History & Inflow Display
  // =========================================================================
  describe('Feature 9: Destination Account History & Inflow Display', () => {
    it('records incoming transfer as INFLOW with destination currency and converted amount', () => {
      const s = engine.createAccount({ id: 'hist_s1', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'hist_d1', currency: 'USD', balance: 100 });

      engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 50,
        exchangeRate: 0.22,
        note: 'Travel cash conversion'
      });

      const destLedger = engine.getAccountLedger(d._id);
      expect(destLedger.ledger.length).toBe(1);
      expect(destLedger.ledger[0].flow).toBe('INFLOW');
      expect(destLedger.ledger[0].displayAmount).toBe(11.00);
      expect(destLedger.ledger[0].displayCurrency).toBe('USD');
      expect(destLedger.ledger[0].note).toBe('Travel cash conversion');
      expect(destLedger.ledger[0].counterpartyAccountId).toBe(s._id);
    });

    it('records outgoing transfer as OUTFLOW with source currency and original amount', () => {
      const s = engine.createAccount({ id: 'hist_s2', currency: 'MYR', balance: 500 });
      const d = engine.createAccount({ id: 'hist_d2', currency: 'USD', balance: 100 });

      engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 50,
        exchangeRate: 0.22
      });

      const srcLedger = engine.getAccountLedger(s._id);
      expect(srcLedger.ledger.length).toBe(1);
      expect(srcLedger.ledger[0].flow).toBe('OUTFLOW');
      expect(srcLedger.ledger[0].displayAmount).toBe(50.00);
      expect(srcLedger.ledger[0].displayCurrency).toBe('MYR');
      expect(srcLedger.ledger[0].counterpartyAccountId).toBe(d._id);
    });

    it('displays multiple incoming cross-currency transfers with respective converted amounts', () => {
      const myrAcc = engine.createAccount({ id: 'hist_myr', currency: 'MYR', balance: 1000 });
      const eurAcc = engine.createAccount({ id: 'hist_eur', currency: 'EUR', balance: 500 });
      const usdAcc = engine.createAccount({ id: 'hist_usd_dest', currency: 'USD', balance: 0 });

      engine.createTransfer({
        accountId: myrAcc._id,
        toAccountId: usdAcc._id,
        amount: 100,
        exchangeRate: 0.22
      }); // +22 USD

      engine.createTransfer({
        accountId: eurAcc._id,
        toAccountId: usdAcc._id,
        amount: 50,
        exchangeRate: 1.08
      }); // +54 USD

      const ledger = engine.getAccountLedger(usdAcc._id).ledger;
      expect(ledger.length).toBe(2);
      const inflows = ledger.map(item => item.displayAmount);
      expect(inflows.includes(22.00)).toBe(true);
      expect(inflows.includes(54.00)).toBe(true);
    });

    it('interleaves incoming transfers with account direct expenses and incomes', () => {
      const s = engine.createAccount({ id: 'hist_s4', currency: 'GBP', balance: 500 });
      const d = engine.createAccount({ id: 'hist_d4', currency: 'USD', balance: 100 });

      engine.createIncome({ accountId: d._id, amount: 50, note: 'Salary bonus' });
      engine.createTransfer({ accountId: s._id, toAccountId: d._id, amount: 80, exchangeRate: 1.25 });
      engine.createExpense({ accountId: d._id, amount: 20, note: 'Coffee' });

      const ledger = engine.getAccountLedger(d._id).ledger;
      expect(ledger.length).toBe(3);
      expect(engine.getAccount(d._id).balance).toBe(230); // 100 + 50 + 100 - 20
    });

    it('removes transfer entry from ledger immediately after transaction deletion', () => {
      const s = engine.createAccount({ id: 'hist_s5', currency: 'USD', balance: 400 });
      const d = engine.createAccount({ id: 'hist_d5', currency: 'EUR', balance: 50 });

      const tx = engine.createTransfer({
        accountId: s._id,
        toAccountId: d._id,
        amount: 100,
        exchangeRate: 0.90
      });

      expect(engine.getAccountLedger(d._id).ledger.length).toBe(1);

      engine.deleteTransaction(tx._id);
      expect(engine.getAccountLedger(d._id).ledger.length).toBe(0);
    });
  });
});
