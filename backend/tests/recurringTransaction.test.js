import { describe, it, expect, vi, afterEach } from 'vitest';
import mongoose from 'mongoose';
import RecurringTransaction from '../models/RecurringTransaction.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import userCronManager, { UserCronManager, calculateNextRunDate } from '../services/userCronManager.js';
import {
  getRecurringTransactions,
  getRecurringTransactionById,
  createRecurringTransaction,
  updateRecurringTransaction,
  toggleRecurringTransactionStatus,
  deleteRecurringTransaction,
  runNowRecurringTransaction
} from '../controllers/recurringTransactionController.js';

describe('Recurring Transactions & User-Scoped Cron Suite', () => {

  afterEach(() => {
    userCronManager.stopAll();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Suite 1: Model & Schema Invariants
  // =========================================================================
  describe('Model & Schema Invariants', () => {
    it('validates required fields, defaults, and enums in RecurringTransaction schema', () => {
      const typeEnum = RecurringTransaction.schema.path('type').enumValues;
      expect(typeEnum).toEqual(['INCOME', 'EXPENSE', 'TRANSFER']);

      const freqEnum = RecurringTransaction.schema.path('frequency').enumValues;
      expect(freqEnum).toEqual(['DAILY', 'WEEKLY', 'MONTHLY']);
      expect(RecurringTransaction.schema.path('frequency').defaultValue).toBe('DAILY');

      const statusEnum = RecurringTransaction.schema.path('status').enumValues;
      expect(statusEnum).toEqual(['ACTIVE', 'PAUSED', 'COMPLETED']);
      expect(RecurringTransaction.schema.path('status').defaultValue).toBe('ACTIVE');

      expect(RecurringTransaction.schema.path('executionCount').defaultValue).toBe(0);
      expect(RecurringTransaction.schema.path('amount').isRequired).toBe(true);
      expect(RecurringTransaction.schema.path('nextRunDate').isRequired).toBe(true);
    });

    it('verifies Transaction schema contains recurringTransactionId and isRecurringInstance', () => {
      const recurringIdPath = Transaction.schema.path('recurringTransactionId');
      expect(recurringIdPath).toBeDefined();
      expect(recurringIdPath.instance).toBe('ObjectId');
      expect(recurringIdPath.defaultValue).toBe(null);

      const isRecurringInstancePath = Transaction.schema.path('isRecurringInstance');
      expect(isRecurringInstancePath).toBeDefined();
      expect(isRecurringInstancePath.instance).toBe('Boolean');
      expect(isRecurringInstancePath.defaultValue).toBe(false);
    });
  });

  // =========================================================================
  // Suite 2: Mathematical Schedule Rollover & Leap Year Date Handling
  // =========================================================================
  describe('Schedule Rollover Date Calculations', () => {
    it('correctly increments DAILY recurrence (+24h)', () => {
      const start = new Date('2026-03-15T10:00:00.000Z');
      const next = calculateNextRunDate(start, 'DAILY');
      expect(next.toISOString()).toBe('2026-03-16T10:00:00.000Z');
    });

    it('correctly increments WEEKLY recurrence (+7 days)', () => {
      const start = new Date('2026-03-15T10:00:00.000Z');
      const next = calculateNextRunDate(start, 'WEEKLY');
      expect(next.toISOString()).toBe('2026-03-22T10:00:00.000Z');
    });

    it('correctly increments MONTHLY recurrence and handles month-end rollover (Jan 31 -> Feb 28 in non-leap year)', () => {
      const jan31 = new Date('2026-01-31T08:00:00.000Z');
      const next = calculateNextRunDate(jan31, 'MONTHLY');
      expect(next.getFullYear()).toBe(2026);
      expect(next.getMonth()).toBe(1); // February (0-indexed)
      expect(next.getDate()).toBe(28);
    });

    it('correctly handles MONTHLY recurrence in leap year (Jan 31, 2024 -> Feb 29, 2024)', () => {
      const leapJan31 = new Date('2024-01-31T12:00:00.000Z');
      const next = calculateNextRunDate(leapJan31, 'MONTHLY');
      expect(next.getFullYear()).toBe(2024);
      expect(next.getMonth()).toBe(1); // February
      expect(next.getDate()).toBe(29);
    });

    it('correctly handles 31st to 30th month rollover (Mar 31 -> Apr 30)', () => {
      const mar31 = new Date('2026-03-31T15:30:00.000Z');
      const next = calculateNextRunDate(mar31, 'MONTHLY');
      expect(next.getMonth()).toBe(3); // April
      expect(next.getDate()).toBe(30);
    });

    it('normalizes case variations for frequency (daily, weekly, monthly)', () => {
      const start = new Date('2026-04-01T12:00:00.000Z');
      expect(calculateNextRunDate(start, 'daily').toISOString()).toBe('2026-04-02T12:00:00.000Z');
      expect(calculateNextRunDate(start, 'weekly').toISOString()).toBe('2026-04-08T12:00:00.000Z');
      expect(calculateNextRunDate(start, 'monthly').getMonth()).toBe(4);
    });

    it('advances 24h as fallback for non-canonical/unknown frequencies to prevent infinite loops', () => {
      const start = new Date('2026-04-01T12:00:00.000Z');
      const nextUnknown = calculateNextRunDate(start, 'HOURLY');
      expect(nextUnknown.getTime()).toBe(start.getTime() + 86400000);
      const nextNull = calculateNextRunDate(start, null);
      expect(nextNull.getTime()).toBe(start.getTime() + 86400000);
    });
  });

  // =========================================================================
  // Suite 3: 1-Cron-Per-User Invariant (Crucial User Requirement)
  // =========================================================================
  describe('UserCronManager: Strictly At Most 1 Cron Runner Per User Invariant', () => {
    it('maintains exactly 1 cron runner in RAM regardless of how many active rules a user creates', async () => {
      const manager = new UserCronManager();
      const user1 = '609b8f1f1f1f1f1f1f1f0001';
      const user2 = '609b8f1f1f1f1f1f1f1f0002';

      expect(manager.getActiveCronCount()).toBe(0);

      // User 1 has 1 active rule
      vi.spyOn(RecurringTransaction, 'countDocuments').mockImplementation(async (query) => {
        if (query.userId === user1 && query.status === 'ACTIVE') return 1;
        return 0;
      });

      await manager.syncUserCron(user1);
      expect(manager.getActiveCronCount()).toBe(1);
      expect(manager.hasUserCron(user1)).toBe(true);

      // User 1 adds 9 more active rules (total 10 rules)
      vi.spyOn(RecurringTransaction, 'countDocuments').mockImplementation(async (query) => {
        if (query.userId === user1 && query.status === 'ACTIVE') return 10;
        return 0;
      });

      await manager.syncUserCron(user1);
      // Invariant check: still strictly 1 cron runner for user 1
      expect(manager.getActiveCronCount()).toBe(1);
      expect(manager.hasUserCron(user1)).toBe(true);

      // User 2 adds 1 active rule
      vi.spyOn(RecurringTransaction, 'countDocuments').mockImplementation(async (query) => {
        if (query.userId === user1 && query.status === 'ACTIVE') return 10;
        if (query.userId === user2 && query.status === 'ACTIVE') return 1;
        return 0;
      });

      await manager.syncUserCron(user2);
      expect(manager.getActiveCronCount()).toBe(2);
      expect(manager.hasUserCron(user2)).toBe(true);

      // User 1 pauses all rules (0 active rules)
      vi.spyOn(RecurringTransaction, 'countDocuments').mockImplementation(async (query) => {
        if (query.userId === user1 && query.status === 'ACTIVE') return 0;
        if (query.userId === user2 && query.status === 'ACTIVE') return 1;
        return 0;
      });

      await manager.syncUserCron(user1);
      // User 1 cron runner should be stopped and unregistered
      expect(manager.hasUserCron(user1)).toBe(false);
      expect(manager.getActiveCronCount()).toBe(1); // User 2 remains active

      // User 1 resumes a rule
      vi.spyOn(RecurringTransaction, 'countDocuments').mockImplementation(async (query) => {
        if (query.userId === user1 && query.status === 'ACTIVE') return 1;
        if (query.userId === user2 && query.status === 'ACTIVE') return 1;
        return 0;
      });

      await manager.syncUserCron(user1);
      expect(manager.hasUserCron(user1)).toBe(true);
      expect(manager.getActiveCronCount()).toBe(2);

      manager.stopAll();
      expect(manager.getActiveCronCount()).toBe(0);
    });

    it('initializes 1 cron runner per distinct active user on startup (initAllActiveUserCrons)', async () => {
      const manager = new UserCronManager();
      const distinctUsers = ['u1', 'u2', 'u3'];

      vi.spyOn(RecurringTransaction, 'distinct').mockResolvedValue(distinctUsers);
      vi.spyOn(RecurringTransaction, 'countDocuments').mockResolvedValue(3);

      await manager.initAllActiveUserCrons();

      expect(manager.getActiveCronCount()).toBe(3);
      expect(manager.hasUserCron('u1')).toBe(true);
      expect(manager.hasUserCron('u2')).toBe(true);
      expect(manager.hasUserCron('u3')).toBe(true);

      manager.stopAll();
    });
  });

  // =========================================================================
  // Suite 4: Execution, Atomic Balance Updates & Transaction Generation
  // =========================================================================
  describe('Execution Engine & Balance Adjustments', () => {
    it('executes overdue EXPENSE rule: creates Transaction, decrements Account balance via $inc, increments executionCount', async () => {
      const manager = new UserCronManager();
      const testUserId = new mongoose.Types.ObjectId();
      const testAccountId = new mongoose.Types.ObjectId();
      const testRuleId = new mongoose.Types.ObjectId();

      const overdueRule = {
        _id: testRuleId,
        userId: testUserId,
        accountId: testAccountId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'EXPENSE',
        amount: 25.50,
        currency: 'MYR',
        frequency: 'DAILY',
        status: 'ACTIVE',
        nextRunDate: new Date(Date.now() - 3600000), // 1 hour ago
        executionCount: 2
      };

      const accountDoc = {
        _id: testAccountId,
        userId: testUserId,
        currency: 'MYR',
        balance: 500.00
      };

      vi.spyOn(RecurringTransaction, 'find').mockResolvedValue([overdueRule]);
      vi.spyOn(RecurringTransaction, 'findOneAndUpdate').mockImplementation(async (query, update) => {
        return {
          ...overdueRule,
          lastRunDate: update.$set.lastRunDate,
          nextRunDate: update.$set.nextRunDate,
          executionCount: overdueRule.executionCount + 1
        };
      });

      vi.spyOn(Account, 'findOne').mockResolvedValue(accountDoc);
      const incSpy = vi.spyOn(Account, 'updateOne').mockImplementation(async (filter, update) => {
        accountDoc.balance += update.$inc.balance;
        return { modifiedCount: 1 };
      });

      let savedTx = null;
      vi.spyOn(Transaction.prototype, 'save').mockImplementation(async function () {
        savedTx = this;
        return this;
      });

      const results = await manager.processUserRecurringTransactions(testUserId);

      expect(results).toHaveLength(1);
      expect(savedTx).toBeDefined();
      expect(savedTx.isRecurringInstance).toBe(true);
      expect(savedTx.recurringTransactionId.toString()).toBe(testRuleId.toString());
      expect(savedTx.amount).toBe(25.50);

      // Atomic balance update verification
      expect(incSpy).toHaveBeenCalledWith(
        { _id: testAccountId, userId: testUserId },
        { $inc: { balance: -25.50 } }
      );
      expect(accountDoc.balance).toBe(474.50);
    });

    it('executes overdue INCOME rule: increments Account balance via $inc', async () => {
      const manager = new UserCronManager();
      const testUserId = new mongoose.Types.ObjectId();
      const testAccountId = new mongoose.Types.ObjectId();
      const testRuleId = new mongoose.Types.ObjectId();

      const overdueRule = {
        _id: testRuleId,
        userId: testUserId,
        accountId: testAccountId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'INCOME',
        amount: 1500.00,
        currency: 'MYR',
        frequency: 'MONTHLY',
        status: 'ACTIVE',
        nextRunDate: new Date(Date.now() - 5000),
        executionCount: 0
      };

      const accountDoc = {
        _id: testAccountId,
        userId: testUserId,
        currency: 'MYR',
        balance: 1000.00
      };

      vi.spyOn(RecurringTransaction, 'find').mockResolvedValue([overdueRule]);
      vi.spyOn(RecurringTransaction, 'findOneAndUpdate').mockResolvedValue({
        ...overdueRule,
        executionCount: 1
      });
      vi.spyOn(Account, 'findOne').mockResolvedValue(accountDoc);
      const incSpy = vi.spyOn(Account, 'updateOne').mockImplementation(async (filter, update) => {
        accountDoc.balance += update.$inc.balance;
        return { modifiedCount: 1 };
      });
      vi.spyOn(Transaction.prototype, 'save').mockResolvedValue({});

      await manager.processUserRecurringTransactions(testUserId);

      expect(incSpy).toHaveBeenCalledWith(
        { _id: testAccountId, userId: testUserId },
        { $inc: { balance: 1500.00 } }
      );
      expect(accountDoc.balance).toBe(2500.00);
    });

    it('executes TRANSFER rule: debits source account and credits destination account', async () => {
      const manager = new UserCronManager();
      const testUserId = new mongoose.Types.ObjectId();
      const srcAccountId = new mongoose.Types.ObjectId();
      const dstAccountId = new mongoose.Types.ObjectId();
      const testRuleId = new mongoose.Types.ObjectId();

      const transferRule = {
        _id: testRuleId,
        userId: testUserId,
        accountId: srcAccountId,
        toAccountId: dstAccountId,
        type: 'TRANSFER',
        amount: 200.00,
        currency: 'MYR',
        exchangeRate: 1.0,
        frequency: 'MONTHLY',
        status: 'ACTIVE',
        nextRunDate: new Date(Date.now() - 1000),
        executionCount: 1
      };

      const srcAccount = { _id: srcAccountId, userId: testUserId, currency: 'MYR', balance: 1000.00 };
      const dstAccount = { _id: dstAccountId, userId: testUserId, currency: 'MYR', balance: 200.00 };

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue(transferRule);
      vi.spyOn(RecurringTransaction, 'findOneAndUpdate').mockResolvedValue(transferRule);
      vi.spyOn(Account, 'findOne').mockImplementation(async ({ _id }) => {
        if (_id.toString() === srcAccountId.toString()) return srcAccount;
        if (_id.toString() === dstAccountId.toString()) return dstAccount;
        return null;
      });

      const incCalls = [];
      vi.spyOn(Account, 'updateOne').mockImplementation(async (filter, update) => {
        incCalls.push({ filter, update });
        return { modifiedCount: 1 };
      });
      vi.spyOn(Transaction.prototype, 'save').mockResolvedValue({});

      const executedTx = await manager.runNowForUser(testUserId, testRuleId);

      expect(executedTx).toBeDefined();
      expect(incCalls).toHaveLength(2);
      expect(incCalls[0].update).toEqual({ $inc: { balance: -200.00 } });
      expect(incCalls[1].update).toEqual({ $inc: { balance: 200.00 } });
    });

    it('calculates proper multi-currency balance effect for INCOME/EXPENSE using rule.exchangeRate', async () => {
      const manager = new UserCronManager();
      const testUserId = new mongoose.Types.ObjectId();
      const testAccountId = new mongoose.Types.ObjectId();
      const testRuleId = new mongoose.Types.ObjectId();

      const multiCurrencyExpenseRule = {
        _id: testRuleId,
        userId: testUserId,
        accountId: testAccountId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'EXPENSE',
        amount: 100.00,
        currency: 'USD',
        exchangeRate: 4.5,
        frequency: 'MONTHLY',
        status: 'ACTIVE',
        nextRunDate: new Date(Date.now() - 1000),
        executionCount: 0
      };

      const accountDoc = {
        _id: testAccountId,
        userId: testUserId,
        currency: 'MYR',
        balance: 1000.00
      };

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue(multiCurrencyExpenseRule);
      vi.spyOn(RecurringTransaction, 'findOneAndUpdate').mockResolvedValue(multiCurrencyExpenseRule);
      vi.spyOn(Account, 'findOne').mockResolvedValue(accountDoc);

      const incCalls = [];
      vi.spyOn(Account, 'updateOne').mockImplementation(async (filter, update) => {
        incCalls.push({ filter, update });
        return { modifiedCount: 1 };
      });
      vi.spyOn(Transaction.prototype, 'save').mockResolvedValue({});

      await manager.runNowForUser(testUserId, testRuleId);

      // Amount 100 USD * 4.5 rate = 450.00 MYR deducted
      expect(incCalls).toHaveLength(1);
      expect(incCalls[0].update).toEqual({ $inc: { balance: -450.00 } });
    });

    it('enforces atomic CAS lock matching nextRunDate in runNowForUser', async () => {
      const manager = new UserCronManager();
      const testUserId = new mongoose.Types.ObjectId();
      const testRuleId = new mongoose.Types.ObjectId();
      const nextRunDate = new Date('2026-05-01T00:00:00.000Z');

      const rule = {
        _id: testRuleId,
        userId: testUserId,
        accountId: new mongoose.Types.ObjectId(),
        type: 'EXPENSE',
        amount: 50.00,
        currency: 'MYR',
        frequency: 'DAILY',
        status: 'ACTIVE',
        nextRunDate,
        executionCount: 1
      };

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue(rule);
      const findOneAndUpdateSpy = vi.spyOn(RecurringTransaction, 'findOneAndUpdate').mockResolvedValue(null);

      const result = await manager.runNowForUser(testUserId, testRuleId);

      expect(result).toBeNull();
      expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: testRuleId,
          status: 'ACTIVE',
          nextRunDate
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  // =========================================================================
  // Suite 5: Controller API Endpoints & User Isolation
  // =========================================================================
  describe('Recurring Controller API & User Isolation', () => {
    const createMockReqRes = (user, body = {}, params = {}, query = {}) => {
      const req = { user, body, params, query };
      const res = {
        statusCode: 200,
        jsonBody: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.jsonBody = payload; return this; }
      };
      const next = vi.fn();
      return { req, res, next };
    };

    it('creates recurring transaction and triggers syncUserCron', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const accountId = new mongoose.Types.ObjectId().toString();
      const categoryId = new mongoose.Types.ObjectId().toString();

      const { req, res, next } = createMockReqRes(
        { id: userId },
        {
          accountId,
          categoryId,
          type: 'EXPENSE',
          amount: 50.00,
          currency: 'MYR',
          frequency: 'WEEKLY',
          note: 'Gym Membership'
        }
      );

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue(null);
      vi.spyOn(Account, 'findOne').mockResolvedValue({ _id: accountId, currency: 'MYR', userId });
      vi.spyOn(Category, 'findOne').mockResolvedValue({ _id: categoryId, name: 'Gym', userId });
      vi.spyOn(RecurringTransaction.prototype, 'save').mockResolvedValue({});
      const syncSpy = vi.spyOn(userCronManager, 'syncUserCron').mockResolvedValue();

      await createRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(201);
      expect(res.jsonBody.success).toBe(true);
      expect(res.jsonBody.data.amount).toBe(50.00);
      expect(res.jsonBody.data.frequency).toBe('WEEKLY');
      expect(syncSpy).toHaveBeenCalledWith(userId);
    });

    it('rejects creation if required fields are missing or amount is <= 0', async () => {
      const { req, res, next } = createMockReqRes(
        { id: 'u1' },
        { accountId: 'acc1', amount: -10, type: 'EXPENSE' }
      );

      await createRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.jsonBody.success).toBe(false);
    });

    it('strictly isolates recurring rules per user on list retrieval', async () => {
      const userAId = 'user_A_id';

      const mockDataUserA = [
        { _id: 'rule_a1', userId: userAId, amount: 10, note: 'User A Rule', status: 'ACTIVE' }
      ];

      vi.spyOn(RecurringTransaction, 'find').mockImplementation((filter) => {
        expect(filter.userId).toBe(userAId);
        return {
          populate: () => ({
            populate: () => ({
              populate: () => ({
                sort: async () => mockDataUserA
              })
            })
          })
        };
      });

      const { req, res, next } = createMockReqRes({ id: userAId });
      await getRecurringTransactions(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.data).toEqual(mockDataUserA);
    });

    it('toggles recurring rule status between ACTIVE and PAUSED', async () => {
      const userId = 'u1';
      const ruleId = 'rule123';
      const ruleDoc = {
        _id: ruleId,
        userId,
        status: 'ACTIVE',
        frequency: 'DAILY',
        nextRunDate: new Date(Date.now() + 86400000),
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue(ruleDoc);
      const syncSpy = vi.spyOn(userCronManager, 'syncUserCron').mockResolvedValue();

      const { req, res, next } = createMockReqRes({ id: userId }, {}, { id: ruleId });
      await toggleRecurringTransactionStatus(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(ruleDoc.status).toBe('PAUSED');
      expect(syncSpy).toHaveBeenCalledWith(userId);
    });

    it('deletes recurring rule and synchronizes user cron', async () => {
      const userId = 'u1';
      const ruleId = 'rule123';

      vi.spyOn(RecurringTransaction, 'findOneAndDelete').mockResolvedValue({ _id: ruleId });
      const syncSpy = vi.spyOn(userCronManager, 'syncUserCron').mockResolvedValue();

      const { req, res, next } = createMockReqRes({ id: userId }, {}, { id: ruleId });
      await deleteRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.success).toBe(true);
      expect(syncSpy).toHaveBeenCalledWith(userId);
    });

    it('executes runNow endpoint on demand and returns the generated transaction', async () => {
      const userId = 'u1';
      const ruleId = 'rule123';
      const mockTx = { _id: 'tx_gen_1', amount: 50, isRecurringInstance: true };

      const runSpy = vi.spyOn(userCronManager, 'runNowForUser').mockResolvedValue(mockTx);

      const { req, res, next } = createMockReqRes({ id: userId }, {}, { id: ruleId });
      await runNowRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(res.jsonBody.success).toBe(true);
      expect(res.jsonBody.transaction).toEqual(mockTx);
      expect(runSpy).toHaveBeenCalledWith(userId, ruleId);
    });

    it('returns 409 Conflict when attempting to create a second active recurring job for the same user', async () => {
      const userId = 'user_with_active_job';
      const { req, res, next } = createMockReqRes(
        { id: userId },
        { accountId: 'acc1', categoryId: 'cat1', type: 'EXPENSE', amount: 30, frequency: 'DAILY' }
      );

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue({
        _id: 'existing_active_id',
        userId,
        status: 'ACTIVE'
      });

      await createRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(409);
      expect(res.jsonBody.success).toBe(false);
      expect(res.jsonBody.message).toContain('Only 1 recurring cron job is permitted per user');
    });

    it('returns 409 Conflict when toggling a paused job to active if another active job exists', async () => {
      const userId = 'user_with_paused_job';
      const pausedRule = {
        _id: 'paused_id',
        userId,
        status: 'PAUSED',
        frequency: 'DAILY',
        save: vi.fn()
      };

      vi.spyOn(RecurringTransaction, 'findOne').mockImplementation(async (filter) => {
        if (filter._id === 'paused_id') return pausedRule;
        if (filter.status === 'ACTIVE') return { _id: 'other_active_id', userId, status: 'ACTIVE' };
        return null;
      });

      const { req, res, next } = createMockReqRes({ id: userId }, {}, { id: 'paused_id' });
      await toggleRecurringTransactionStatus(req, res, next);

      expect(res.statusCode).toBe(409);
      expect(res.jsonBody.success).toBe(false);
      expect(res.jsonBody.message).toContain('Only 1 recurring cron job is permitted per user');
      expect(pausedRule.save).not.toHaveBeenCalled();
    });

    it('persists exchangeRate in createRecurringTransaction', async () => {
      const userId = 'u_exchange_rate';
      const accountId = new mongoose.Types.ObjectId().toString();
      const categoryId = new mongoose.Types.ObjectId().toString();

      const { req, res, next } = createMockReqRes(
        { id: userId },
        {
          accountId,
          categoryId,
          type: 'EXPENSE',
          amount: 100,
          currency: 'USD',
          exchangeRate: 4.45,
          frequency: 'DAILY'
        }
      );

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue(null);
      vi.spyOn(Account, 'findOne').mockResolvedValue({ _id: accountId, currency: 'MYR', userId });
      vi.spyOn(Category, 'findOne').mockResolvedValue({ _id: categoryId, name: 'Food', userId });
      vi.spyOn(RecurringTransaction.prototype, 'save').mockResolvedValue({});
      vi.spyOn(userCronManager, 'syncUserCron').mockResolvedValue();

      await createRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(201);
      expect(res.jsonBody.data.exchangeRate).toBe(4.45);
    });

    it('returns 409 Conflict when createRecurringTransaction encounters MongoDB duplicate key error 11000', async () => {
      const userId = 'u_dup';
      const accountId = new mongoose.Types.ObjectId().toString();
      const categoryId = new mongoose.Types.ObjectId().toString();

      const { req, res, next } = createMockReqRes(
        { id: userId },
        {
          accountId,
          categoryId,
          type: 'EXPENSE',
          amount: 50,
          frequency: 'DAILY'
        }
      );

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue(null);
      vi.spyOn(Account, 'findOne').mockResolvedValue({ _id: accountId, currency: 'MYR', userId });
      vi.spyOn(Category, 'findOne').mockResolvedValue({ _id: categoryId, name: 'Food', userId });
      const err = new Error('E11000 duplicate key error');
      err.code = 11000;
      vi.spyOn(RecurringTransaction.prototype, 'save').mockRejectedValue(err);

      await createRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(409);
      expect(res.jsonBody.success).toBe(false);
      expect(res.jsonBody.message).toContain('Only 1 recurring cron job is permitted per user');
    });

    it('validates account ownership in updateRecurringTransaction and returns 404 for unowned account', async () => {
      const userId = 'u_owner_test';
      const ruleId = 'rule_1';
      const existingRule = {
        _id: ruleId,
        userId,
        accountId: 'orig_acc',
        status: 'PAUSED',
        save: vi.fn()
      };

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue(existingRule);
      vi.spyOn(Account, 'findOne').mockResolvedValue(null); // Account not found for this user

      const { req, res, next } = createMockReqRes(
        { id: userId },
        { accountId: 'unauthorized_acc_id' },
        { id: ruleId }
      );

      await updateRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(404);
      expect(res.jsonBody.message).toBe('Source account not found.');
      expect(existingRule.save).not.toHaveBeenCalled();
    });

    it('returns 409 Conflict when updateRecurringTransaction activates a rule while another active rule exists', async () => {
      const userId = 'u_reactivate_conflict';
      const ruleId = 'rule_to_activate';
      const existingRule = {
        _id: ruleId,
        userId,
        status: 'PAUSED',
        frequency: 'DAILY',
        save: vi.fn()
      };

      vi.spyOn(RecurringTransaction, 'findOne').mockImplementation(async (filter) => {
        if (filter._id === ruleId) return existingRule;
        if (filter.status === 'ACTIVE' && filter._id?.$ne === ruleId) {
          return { _id: 'other_active_rule', userId, status: 'ACTIVE' };
        }
        return null;
      });

      const { req, res, next } = createMockReqRes(
        { id: userId },
        { status: 'ACTIVE' },
        { id: ruleId }
      );

      await updateRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(409);
      expect(res.jsonBody.message).toContain('Only 1 recurring cron job is permitted per user');
      expect(existingRule.save).not.toHaveBeenCalled();
    });

    it('returns 409 Conflict when updateRecurringTransaction hits MongoDB duplicate key error 11000', async () => {
      const userId = 'u_update_dup';
      const ruleId = 'rule_dup_update';
      const existingRule = {
        _id: ruleId,
        userId,
        status: 'PAUSED',
        save: vi.fn().mockImplementation(async () => {
          const err = new Error('E11000 duplicate key');
          err.code = 11000;
          throw err;
        })
      };

      vi.spyOn(RecurringTransaction, 'findOne').mockImplementation(async (filter) => {
        if (filter._id === ruleId) return existingRule;
        return null;
      });

      const { req, res, next } = createMockReqRes(
        { id: userId },
        { status: 'ACTIVE' },
        { id: ruleId }
      );

      await updateRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(409);
      expect(res.jsonBody.message).toContain('Only 1 recurring cron job is permitted per user');
    });

    it('rejects update if categoryId does not belong to authenticated user (404)', async () => {
      const userId = 'user_owner_cat';
      const foreignCatId = 'foreign_cat_id';
      const ruleId = 'rule_cat_1';
      const existingRule = {
        _id: ruleId,
        userId,
        categoryId: 'orig_cat_id',
        status: 'ACTIVE',
        frequency: 'DAILY',
        save: vi.fn()
      };

      vi.spyOn(RecurringTransaction, 'findOne').mockResolvedValue(existingRule);
      vi.spyOn(Category, 'findOne').mockResolvedValue(null);

      const { req, res, next } = createMockReqRes({ id: userId }, { categoryId: foreignCatId }, { id: ruleId });
      await updateRecurringTransaction(req, res, next);

      expect(res.statusCode).toBe(404);
      expect(res.jsonBody.success).toBe(false);
      expect(res.jsonBody.message).toBe('Category not found.');
      expect(existingRule.save).not.toHaveBeenCalled();
    });

    it('returns 409 Conflict when toggleRecurringTransactionStatus hits MongoDB duplicate key error 11000', async () => {
      const userId = 'user_toggle_dup';
      const ruleId = 'rule_toggle_dup_id';
      const pausedRule = {
        _id: ruleId,
        userId,
        status: 'PAUSED',
        frequency: 'DAILY',
        save: vi.fn().mockImplementation(async () => {
          const err = new Error('E11000 duplicate key');
          err.code = 11000;
          throw err;
        })
      };

      vi.spyOn(RecurringTransaction, 'findOne').mockImplementation(async (filter) => {
        if (filter._id === ruleId) return pausedRule;
        return null;
      });

      const { req, res, next } = createMockReqRes({ id: userId }, {}, { id: ruleId });
      await toggleRecurringTransactionStatus(req, res, next);

      expect(res.statusCode).toBe(409);
      expect(res.jsonBody.success).toBe(false);
      expect(res.jsonBody.message).toContain('Only 1 recurring cron job is permitted per user');
    });

    it('verifies userCronManager.getUserCronCount returns 0 or 1 per user and matches hasUserCron', async () => {
      const manager = new UserCronManager();
      const u1 = 'user_cron_count_1';

      expect(manager.getUserCronCount(u1)).toBe(0);
      expect(manager.hasUserCron(u1)).toBe(false);
      expect(manager.getUserCronCount()).toBe(0);

      vi.spyOn(RecurringTransaction, 'countDocuments').mockImplementation(async (q) => {
        if (q.userId === u1 && q.status === 'ACTIVE') return 1;
        return 0;
      });

      await manager.syncUserCron(u1);

      expect(manager.getUserCronCount(u1)).toBe(1);
      expect(manager.hasUserCron(u1)).toBe(true);
      expect(manager.getUserCronCount()).toBe(1);

      manager.stopAll();
      expect(manager.getUserCronCount(u1)).toBe(0);
      expect(manager.getUserCronCount()).toBe(0);
    });
  });

  // =========================================================================
  // Suite 6: Cross-Currency Math & While-Loop Safety Guards
  // =========================================================================
  describe('Cross-Currency Math & While-Loop Safety Guards', () => {
    it('executes cross-currency INCOME rule: credits balance scaled by exchangeRate', async () => {
      const manager = new UserCronManager();
      const testUserId = new mongoose.Types.ObjectId();
      const testAccountId = new mongoose.Types.ObjectId();
      const testRuleId = new mongoose.Types.ObjectId();

      const crossCurrencyRule = {
        _id: testRuleId,
        userId: testUserId,
        accountId: testAccountId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'INCOME',
        amount: 200.00,
        currency: 'EUR',
        exchangeRate: 5.0,
        frequency: 'MONTHLY',
        status: 'ACTIVE',
        nextRunDate: new Date(Date.now() - 5000),
        executionCount: 0
      };

      const accountDoc = {
        _id: testAccountId,
        userId: testUserId,
        currency: 'MYR',
        balance: 500.00
      };

      vi.spyOn(RecurringTransaction, 'find').mockResolvedValue([crossCurrencyRule]);
      vi.spyOn(RecurringTransaction, 'findOneAndUpdate').mockResolvedValue({
        ...crossCurrencyRule,
        executionCount: 1
      });
      vi.spyOn(Account, 'findOne').mockResolvedValue(accountDoc);
      const incSpy = vi.spyOn(Account, 'updateOne').mockImplementation(async (filter, update) => {
        accountDoc.balance += update.$inc.balance;
        return { modifiedCount: 1 };
      });
      vi.spyOn(Transaction.prototype, 'save').mockResolvedValue({});

      await manager.processUserRecurringTransactions(testUserId);

      // 200 EUR * 5.0 = 1000 MYR credit
      expect(incSpy).toHaveBeenCalledWith(
        { _id: testAccountId, userId: testUserId },
        { $inc: { balance: 1000.00 } }
      );
      expect(accountDoc.balance).toBe(1500.00);
    });

    it('executes same-currency EXPENSE rule: uses raw amount without conversion', async () => {
      const manager = new UserCronManager();
      const testUserId = new mongoose.Types.ObjectId();
      const testAccountId = new mongoose.Types.ObjectId();
      const testRuleId = new mongoose.Types.ObjectId();

      const rule = {
        _id: testRuleId,
        userId: testUserId,
        accountId: testAccountId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'EXPENSE',
        amount: 50.00,
        currency: 'MYR',
        exchangeRate: 2.0, // should not affect MYR account
        frequency: 'DAILY',
        status: 'ACTIVE',
        nextRunDate: new Date(Date.now() - 5000),
        executionCount: 0
      };

      const accountDoc = {
        _id: testAccountId,
        userId: testUserId,
        currency: 'MYR',
        balance: 500.00
      };

      vi.spyOn(RecurringTransaction, 'find').mockResolvedValue([rule]);
      vi.spyOn(RecurringTransaction, 'findOneAndUpdate').mockResolvedValue({ ...rule, executionCount: 1 });
      vi.spyOn(Account, 'findOne').mockResolvedValue(accountDoc);
      const incSpy = vi.spyOn(Account, 'updateOne').mockImplementation(async (filter, update) => {
        accountDoc.balance += update.$inc.balance;
        return { modifiedCount: 1 };
      });
      vi.spyOn(Transaction.prototype, 'save').mockResolvedValue({});

      await manager.processUserRecurringTransactions(testUserId);

      expect(incSpy).toHaveBeenCalledWith(
        { _id: testAccountId, userId: testUserId },
        { $inc: { balance: -50.00 } }
      );
      expect(accountDoc.balance).toBe(450.00);
    });

    it('safely breaks while-loop when frequency is invalid and does not hang event loop', async () => {
      const manager = new UserCronManager();
      const testUserId = new mongoose.Types.ObjectId();
      const testAccountId = new mongoose.Types.ObjectId();
      const testRuleId = new mongoose.Types.ObjectId();

      const corruptRule = {
        _id: testRuleId,
        userId: testUserId,
        accountId: testAccountId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'EXPENSE',
        amount: 10.00,
        currency: 'MYR',
        frequency: 'CORRUPTED_FREQ',
        status: 'ACTIVE',
        nextRunDate: new Date(Date.now() - 100000),
        executionCount: 0
      };

      vi.spyOn(RecurringTransaction, 'find').mockResolvedValue([corruptRule]);
      const findOneAndUpdateSpy = vi.spyOn(RecurringTransaction, 'findOneAndUpdate').mockResolvedValue({
        ...corruptRule,
        executionCount: 1
      });
      vi.spyOn(Account, 'findOne').mockResolvedValue({ _id: testAccountId, currency: 'MYR', userId: testUserId });
      vi.spyOn(Account, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
      vi.spyOn(Transaction.prototype, 'save').mockResolvedValue({});

      const startMs = Date.now();
      await manager.processUserRecurringTransactions(testUserId);
      const durationMs = Date.now() - startMs;

      // Must finish almost instantaneously (< 500ms) without infinite looping
      expect(durationMs).toBeLessThan(500);
      expect(findOneAndUpdateSpy).toHaveBeenCalled();
    });

    it('normalizes lowercase frequencies (daily, weekly, monthly)', () => {
      const base = new Date('2026-06-01T00:00:00.000Z');
      expect(calculateNextRunDate(base, 'daily').toISOString()).toBe('2026-06-02T00:00:00.000Z');
      expect(calculateNextRunDate(base, 'weekly').toISOString()).toBe('2026-06-08T00:00:00.000Z');
      expect(calculateNextRunDate(base, 'monthly').toISOString()).toBe('2026-07-01T00:00:00.000Z');
    });
  });

  // =========================================================================
  // Suite 7: Express Router Mounting & Server Startup Regression Guard
  // =========================================================================
  describe('Express Router Mounting & Server Startup Regression Guard', () => {
    it('verifies backend/routes/index.js imports and mounts recurring routes cleanly on Express app', async () => {
      const express = (await import('express')).default;
      const apiRouter = (await import('../routes/index.js')).default;

      expect(apiRouter).toBeDefined();
      expect(typeof apiRouter).toBe('function');

      const app = express();
      app.use('/api', apiRouter);

      const hasRecurring = apiRouter.stack.some(layer => {
        if (layer.matchers?.[0]?.('/recurring')) return true;
        if (layer.regexp && layer.regexp.toString().includes('recurring')) return true;
        if (layer.route?.path && layer.route.path.includes('recurring')) return true;
        return false;
      });

      const hasRecurringTxn = apiRouter.stack.some(layer => {
        if (layer.matchers?.[0]?.('/recurring-transactions')) return true;
        if (layer.regexp && layer.regexp.toString().includes('recurring-transactions')) return true;
        if (layer.route?.path && layer.route.path.includes('recurring-transactions')) return true;
        return false;
      });

      expect(hasRecurring).toBe(true);
      expect(hasRecurringTxn).toBe(true);
    });

    it('verifies backend/index.js has no phantom imports and configures userCronManager startup hook', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const baseDir = import.meta.dirname || path.resolve('.');
      const indexContent = fs.readFileSync(path.resolve(baseDir, '../index.js'), 'utf-8');

      // Must not reference non-existent scheduler file or method
      expect(indexContent).not.toContain('recurringScheduler');
      expect(indexContent).not.toContain('startRecurringScheduler');

      // Must import and connect userCronManager
      expect(indexContent).toContain("import userCronManager from './services/userCronManager.js';");
      expect(indexContent).toContain('userCronManager.initAllActiveUserCrons()');
    });

    it('verifies Node.js ESM loader resolves backend/routes/index.js with exit code 0', async () => {
      const { execSync } = await import('child_process');
      const path = await import('path');
      const baseDir = import.meta.dirname || path.resolve('.');
      const backendDir = path.resolve(baseDir, '..');

      expect(() => {
        execSync('node --input-type=module -e "import(\'./routes/index.js\')"', {
          cwd: backendDir,
          stdio: 'pipe'
        });
      }).not.toThrow();
    });

    it('boots backend/index.js in Node process without throwing ERR_MODULE_NOT_FOUND', async () => {
      const { spawn } = await import('child_process');
      const path = await import('path');
      const baseDir = import.meta.dirname || path.resolve('.');
      const backendDir = path.resolve(baseDir, '..');

      await new Promise((resolve, reject) => {
        const child = spawn('node', ['index.js'], {
          cwd: backendDir,
          env: { ...process.env, PORT: '0', NODE_ENV: 'test' }
        });

        let stderr = '';
        child.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });

        const timer = setTimeout(() => {
          child.kill('SIGTERM');
          if (stderr.includes('ERR_MODULE_NOT_FOUND')) {
            reject(new Error(`Server failed module resolution: ${stderr}`));
          } else {
            resolve();
          }
        }, 600);

        child.on('exit', (code) => {
          clearTimeout(timer);
          if (stderr.includes('ERR_MODULE_NOT_FOUND')) {
            reject(new Error(`Fatal import error: ${stderr}`));
          } else {
            resolve();
          }
        });
      });
    });
  });
});


