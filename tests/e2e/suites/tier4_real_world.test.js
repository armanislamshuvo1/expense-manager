import { describe, it, expect, beforeEach } from '../harness/testHelper.js';
import { TransferSimulationEngine } from '../harness/engine.js';

describe('Tier 4: Real-World Application Scenarios Suite', () => {
  let engine;

  beforeEach(() => {
    engine = new TransferSimulationEngine({ userId: 'tier4_real_world_user', baseCurrency: 'MYR' });
  });

  // =========================================================================
  // Scenario 1: Malaysia to US Travel Workflow
  // =========================================================================
  describe('Scenario 1: International Travel (Malaysia to US)', () => {
    it('executes full travel flow: currency conversion, arrival expenses, and ledger check', () => {
      // Setup accounts
      const maybank = engine.createAccount({
        id: 'acc_maybank_myr',
        name: 'Maybank Savings',
        currency: 'MYR',
        balance: 3500.00,
        type: 'SAVINGS'
      });
      const travelCard = engine.createAccount({
        id: 'acc_travel_usd',
        name: 'USD Travel Card',
        currency: 'USD',
        balance: 0.00,
        type: 'CARD'
      });

      // 1. User transfers MYR 500 to USD at 0.22 exchange rate before departure
      const travelTransfer = engine.createTransfer({
        accountId: maybank._id,
        toAccountId: travelCard._id,
        amount: 500.00,
        currency: 'MYR',
        exchangeRate: 0.22,
        date: '2026-11-15T08:00:00.000Z',
        note: 'Travel cash buffer for SFO trip'
      });

      expect(travelTransfer.amount).toBe(500.00);
      expect(travelTransfer.toAmount).toBe(110.00);
      expect(engine.getAccount(maybank._id).balance).toBe(3000.00);
      expect(engine.getAccount(travelCard._id).balance).toBe(110.00);

      // 2. User lands at San Francisco Airport and buys coffee
      engine.createExpense({
        accountId: travelCard._id,
        amount: 4.50,
        currency: 'USD',
        date: '2026-11-15T14:30:00.000Z',
        note: 'Peet’s Coffee SFO'
      });

      // 3. User takes an Uber to downtown hotel
      engine.createExpense({
        accountId: travelCard._id,
        amount: 38.00,
        currency: 'USD',
        date: '2026-11-15T15:15:00.000Z',
        note: 'Uber to Union Square'
      });

      // Verify final balances
      expect(engine.getAccount(maybank._id).balance).toBe(3000.00);
      expect(engine.getAccount(travelCard._id).balance).toBe(67.50); // 110 - 4.50 - 38.00

      // Verify USD Travel Card ledger
      const cardLedger = engine.getAccountLedger(travelCard._id);
      expect(cardLedger.ledger.length).toBe(3);
      expect(cardLedger.ledger[0].displayAmount).toBe(38.00); // newest expense
      expect(cardLedger.ledger[0].flow).toBe('OUTFLOW');
      expect(cardLedger.ledger[2].displayAmount).toBe(110.00); // transfer inflow
      expect(cardLedger.ledger[2].flow).toBe('INFLOW');
      expect(cardLedger.ledger[2].displayCurrency).toBe('USD');
    });
  });

  // =========================================================================
  // Scenario 2: Multi-Currency Business Treasury Rebalancing
  // =========================================================================
  describe('Scenario 2: Multi-Currency Corporate Rebalancing (EUR -> USD -> GBP)', () => {
    it('executes multi-tier treasury rebalance and employee payroll disbursement', () => {
      const eurOperating = engine.createAccount({
        id: 'acc_eur_operating',
        name: 'EUR Main Operating',
        currency: 'EUR',
        balance: 50000.00,
        type: 'BANK'
      });
      const usdTreasury = engine.createAccount({
        id: 'acc_usd_treasury',
        name: 'USD Treasury Reserve',
        currency: 'USD',
        balance: 10000.00,
        type: 'BANK'
      });
      const gbpPayroll = engine.createAccount({
        id: 'acc_gbp_payroll',
        name: 'UK Payroll Account',
        currency: 'GBP',
        balance: 1000.00,
        type: 'BANK'
      });

      // Step 1: Rebalance EUR 10,000 into USD Treasury at 1.08 rate (+10,800 USD)
      const rebalance1 = engine.createTransfer({
        accountId: eurOperating._id,
        toAccountId: usdTreasury._id,
        amount: 10000.00,
        exchangeRate: 1.08,
        note: 'Q4 Treasury funding'
      });
      expect(rebalance1.toAmount).toBe(10800.00);
      expect(engine.getAccount(eurOperating._id).balance).toBe(40000.00);
      expect(engine.getAccount(usdTreasury._id).balance).toBe(20800.00);

      // Step 2: Transfer USD 5,000 from USD Treasury into GBP Payroll at 0.79 rate (+3,950 GBP)
      const rebalance2 = engine.createTransfer({
        accountId: usdTreasury._id,
        toAccountId: gbpPayroll._id,
        amount: 5000.00,
        exchangeRate: 0.79,
        note: 'London office monthly payroll top-up'
      });
      expect(rebalance2.toAmount).toBe(3950.00);
      expect(engine.getAccount(usdTreasury._id).balance).toBe(15800.00); // 20800 - 5000
      expect(engine.getAccount(gbpPayroll._id).balance).toBe(4950.00); // 1000 + 3950

      // Step 3: Run Payroll payout of 3,500 GBP
      engine.createExpense({
        accountId: gbpPayroll._id,
        amount: 3500.00,
        currency: 'GBP',
        note: 'November Payroll batch'
      });

      expect(engine.getAccount(gbpPayroll._id).balance).toBe(1450.00); // 4950 - 3500
      expect(engine.getAccount(eurOperating._id).balance).toBe(40000.00);
      expect(engine.getAccount(usdTreasury._id).balance).toBe(15800.00);
    });
  });

  // =========================================================================
  // Scenario 3: Currency Exchange with Fractional Cents & Exchange Margins
  // =========================================================================
  describe('Scenario 3: Fractional Cents, FX Margins & Multi-Decimal Rates', () => {
    it('accurately calculates conversion with 4-decimal exchange rates and micro cents', () => {
      const eurSavings = engine.createAccount({
        id: 'acc_eur_sav',
        currency: 'EUR',
        balance: 5000.00
      });
      const jpyCash = engine.createAccount({
        id: 'acc_jpy_cash',
        currency: 'JPY',
        balance: 0.00
      });

      // Transfer EUR 1,250.50 to JPY at 162.4525 (with 4-decimal interbank rate)
      // 1250.50 * 162.4525 = 203146.85125 -> rounds to 203146.85
      const fxTx = engine.createTransfer({
        accountId: eurSavings._id,
        toAccountId: jpyCash._id,
        amount: 1250.50,
        exchangeRate: 162.4525,
        note: 'Tokyo conference cash exchange'
      });

      expect(fxTx.amount).toBe(1250.50);
      expect(fxTx.toAmount).toBe(203146.85);
      expect(engine.getAccount(eurSavings._id).balance).toBe(3749.50);
      expect(engine.getAccount(jpyCash._id).balance).toBe(203146.85);

      // Local ATM withdrawal / train pass purchase
      engine.createExpense({
        accountId: jpyCash._id,
        amount: 12000.00,
        currency: 'JPY',
        note: 'Suica card recharge'
      });

      expect(engine.getAccount(jpyCash._id).balance).toBe(191146.85);
    });
  });

  // =========================================================================
  // Scenario 4: User Correction Workflow (Mistype, Update, Delete Rollback)
  // =========================================================================
  describe('Scenario 4: Correction Workflow (Mistype Amount, Update, and Rollback)', () => {
    it('seamlessly corrects mistyped transfer amount and supports full rollback', () => {
      const myrAccount = engine.createAccount({
        id: 'acc_myr_correct',
        name: 'CIMB Bank',
        currency: 'MYR',
        balance: 1000.00
      });
      const usdAccount = engine.createAccount({
        id: 'acc_usd_correct',
        name: 'Wise USD Balance',
        currency: 'USD',
        balance: 200.00
      });

      // 1. User intends to send 100 MYR, but accidentally types 10 MYR at 0.22
      const mistypedTx = engine.createTransfer({
        accountId: myrAccount._id,
        toAccountId: usdAccount._id,
        amount: 10.00,
        exchangeRate: 0.22,
        note: 'Emergency transfer'
      });

      expect(engine.getAccount(myrAccount._id).balance).toBe(990.00);
      expect(engine.getAccount(usdAccount._id).balance).toBe(202.20);

      // 2. User notices typo and updates amount to 200 MYR (rate 0.22 -> 44.00 USD)
      engine.updateTransfer(mistypedTx._id, {
        amount: 200.00,
        exchangeRate: 0.22,
        note: 'Corrected emergency transfer'
      });

      expect(engine.getAccount(myrAccount._id).balance).toBe(800.00);
      expect(engine.getAccount(usdAccount._id).balance).toBe(244.00);

      // 3. User changes mind, cancels transfer completely
      engine.deleteTransaction(mistypedTx._id);

      // Verify accounts have returned to their exact original balances
      expect(engine.getAccount(myrAccount._id).balance).toBe(1000.00);
      expect(engine.getAccount(usdAccount._id).balance).toBe(200.00);
      expect(engine.getAccountLedger(usdAccount._id).ledger.length).toBe(0);
    });
  });

  // =========================================================================
  // Scenario 5: In-Flight Offline Batch Synchronization
  // =========================================================================
  describe('Scenario 5: In-Flight Offline Batch Synchronization', () => {
    it('processes offline travel queue with multi-currency transfers upon re-connection', () => {
      const myrPrimary = engine.createAccount({
        id: 'acc_fly_myr',
        name: 'Maybank',
        currency: 'MYR',
        balance: 5000.00
      });
      const usdTravel = engine.createAccount({
        id: 'acc_fly_usd',
        name: 'USD Visa Card',
        currency: 'USD',
        balance: 100.00
      });
      const sgdTransit = engine.createAccount({
        id: 'acc_fly_sgd',
        name: 'EZ-Link SGD',
        currency: 'SGD',
        balance: 20.00
      });

      // While on international flight, client queues 4 operations offline:
      const offlineQueue = [
        {
          type: 'CREATE',
          clientTxId: 'flight_tx_1',
          data: {
            accountId: myrPrimary._id,
            toAccountId: usdTravel._id,
            amount: 300.00,
            exchangeRate: 0.22,
            note: 'Pre-load USD Card'
          }
        },
        {
          type: 'CREATE',
          clientTxId: 'flight_tx_2',
          data: {
            accountId: myrPrimary._id,
            toAccountId: sgdTransit._id,
            amount: 150.00,
            exchangeRate: 0.30,
            note: 'Pre-load SG Transit'
          }
        }
      ];

      // Airplane lands in Singapore, connects to Changi Airport Wi-Fi, triggers sync
      const syncResponse = engine.syncBatch(offlineQueue);

      expect(syncResponse.success).toBe(true);
      expect(syncResponse.processedOps.length).toBe(2);

      // Verify Maybank debited: 5000 - 300 - 150 = 4550 MYR
      expect(engine.getAccount(myrPrimary._id).balance).toBe(4550.00);

      // Verify USD Travel Card credited: 100 + (300 * 0.22 = 66) = 166.00 USD
      expect(engine.getAccount(usdTravel._id).balance).toBe(166.00);

      // Verify SGD Transit credited: 20 + (150 * 0.30 = 45) = 65.00 SGD
      expect(engine.getAccount(sgdTransit._id).balance).toBe(65.00);

      // Verify ledger records
      const sgdLedger = engine.getAccountLedger(sgdTransit._id);
      expect(sgdLedger.ledger.length).toBe(1);
      expect(sgdLedger.ledger[0].displayAmount).toBe(45.00);
      expect(sgdLedger.ledger[0].displayCurrency).toBe('SGD');
    });
  });
});
