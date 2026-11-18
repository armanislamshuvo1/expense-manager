import cron from 'node-cron';
import mongoose from 'mongoose';
import RecurringTransaction from '../models/RecurringTransaction.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

export const calculateNextRunDate = (fromDate, frequency) => {
  const base = new Date(fromDate);
  const result = new Date(base.getTime());
  const normFreq = String(frequency || '').trim().toUpperCase();

  if (normFreq === 'DAILY') {
    result.setDate(result.getDate() + 1);
    return result;
  }

  if (normFreq === 'WEEKLY') {
    result.setDate(result.getDate() + 7);
    return result;
  }

  if (normFreq === 'MONTHLY') {
    const dayOfMonth = base.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + 1);
    const maxDaysInNewMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(dayOfMonth, maxDaysInNewMonth));
    return result;
  }

  // Guard against infinite while loops on non-canonical / invalid frequencies
  result.setTime(result.getTime() + 86400000);
  return result;
};

export class UserCronManager {
  constructor() {
    // Map of userId string -> node-cron Task
    this.userCrons = new Map();
  }

  /**
   * Synchronize the user-scoped cron job.
   * Invariant: strictly at most 1 cron job active in memory per user.
   * If active recurring transactions > 0 and no cron job exists, creates 1 cron job.
   * If 0 active recurring transactions and a cron job exists, stops and unregisters it.
   */
  async syncUserCron(userId) {
    if (!userId) return;
    const userKey = userId.toString();

    const activeCount = await RecurringTransaction.countDocuments({
      userId,
      status: 'ACTIVE'
    });

    if (activeCount > 0) {
      if (!this.userCrons.has(userKey)) {
        const cronExpression = process.env.CRON_SCHEDULE || '* * * * *';
        const task = cron.schedule(cronExpression, async () => {
          try {
            await this.processUserRecurringTransactions(userId);
          } catch (err) {
            console.error(`[UserCronManager] Error executing cron for user ${userKey}:`, err);
          }
        });
        this.userCrons.set(userKey, task);
      }
    } else {
      this.unregisterUserCron(userId);
    }
  }

  /**
   * Stop and remove cron runner for a given user.
   */
  unregisterUserCron(userId) {
    if (!userId) return;
    const userKey = userId.toString();
    const task = this.userCrons.get(userKey);
    if (task) {
      try {
        task.stop();
      } catch (_) {}
      this.userCrons.delete(userKey);
    }
  }

  /**
   * Total number of active user cron jobs currently in RAM.
   */
  getActiveCronCount() {
    return this.userCrons.size;
  }

  /**
   * Return number of active cron runners for a specific user (strictly 0 or 1),
   * or total active cron runners in RAM across all users if no userId is provided.
   */
  getUserCronCount(userId) {
    if (!userId) return this.getActiveCronCount();
    return this.hasUserCron(userId) ? 1 : 0;
  }

  /**
   * Check if a cron job is currently registered in RAM for a user.
   */
  hasUserCron(userId) {
    if (!userId) return false;
    return this.userCrons.has(userId.toString());
  }

  /**
   * Retrieve the cron task object for a user.
   */
  getUserCron(userId) {
    if (!userId) return null;
    return this.userCrons.get(userId.toString()) || null;
  }

  /**
   * Stop all active cron runners and clear in-memory map.
   */
  stopAll() {
    for (const [, task] of this.userCrons.entries()) {
      try {
        task.stop();
      } catch (_) {}
    }
    this.userCrons.clear();
  }

  /**
   * Re-initialize cron jobs for all distinct users with active recurring rules.
   * Typically called on server boot.
   */
  async initAllActiveUserCrons() {
    try {
      const activeUserIds = await RecurringTransaction.distinct('userId', { status: 'ACTIVE' });
      for (const userId of activeUserIds) {
        await this.syncUserCron(userId);
      }
      console.log(`[UserCronManager] Initialized cron runners for ${this.userCrons.size} active users.`);
    } catch (err) {
      console.error('[UserCronManager] Failed to initialize active user crons on startup:', err);
    }
  }

  /**
   * Process all overdue active recurring transactions for a user.
   * Atomically advances nextRunDate, creates genuine Transaction records,
   * updates account balance using $inc, increments executionCount, and clears InsightCache.
   */
  async processUserRecurringTransactions(userId) {
    if (!userId) return [];
    const now = new Date();

    const overdueRules = await RecurringTransaction.find({
      userId,
      status: 'ACTIVE',
      nextRunDate: { $lte: now }
    });

    const createdTransactions = [];

    for (const rule of overdueRules) {
      const frequency = String(rule.frequency || '').toUpperCase();
      const nextRun = calculateNextRunDate(rule.nextRunDate, frequency);
      let finalNextRun = nextRun;
      while (finalNextRun <= now) {
        const currentNextRun = finalNextRun;
        finalNextRun = calculateNextRunDate(finalNextRun, frequency);
        if (finalNextRun <= currentNextRun) {
          break;
        }
      }

      // Atomic lock via findOneAndUpdate
      const claimedRule = await RecurringTransaction.findOneAndUpdate(
        {
          _id: rule._id,
          status: 'ACTIVE',
          nextRunDate: rule.nextRunDate
        },
        {
          $set: {
            lastRunDate: now,
            nextRunDate: finalNextRun
          },
          $inc: {
            executionCount: 1
          }
        },
        { new: true }
      );

      if (!claimedRule) continue;

      const createdTx = await this._executeRecurringRule(claimedRule, now);
      if (createdTx) {
        createdTransactions.push(createdTx);
      }
    }

    if (createdTransactions.length > 0) {
      await this._clearInsightCache(userId);
    }

    return createdTransactions;
  }

  /**
   * Run overdue or specified recurring rule immediately for a user.
   */
  async runNowForUser(userId, recurringId = null) {
    if (!userId) return null;
    const now = new Date();

    if (recurringId) {
      const rule = await RecurringTransaction.findOne({
        _id: recurringId,
        userId,
        status: 'ACTIVE'
      });
      if (!rule) return null;

      const frequency = String(rule.frequency || '').toUpperCase();
      const nextRun = calculateNextRunDate(rule.nextRunDate || now, frequency);
      let finalNextRun = nextRun;
      while (finalNextRun <= now) {
        const currentNextRun = finalNextRun;
        finalNextRun = calculateNextRunDate(finalNextRun, frequency);
        if (finalNextRun <= currentNextRun) {
          break;
        }
      }

      const claimedRule = await RecurringTransaction.findOneAndUpdate(
        {
          _id: rule._id,
          status: 'ACTIVE',
          nextRunDate: rule.nextRunDate
        },
        {
          $set: {
            lastRunDate: now,
            nextRunDate: finalNextRun
          },
          $inc: {
            executionCount: 1
          }
        },
        { new: true }
      );

      if (!claimedRule) return null;

      const createdTx = await this._executeRecurringRule(claimedRule, now);
      if (createdTx) {
        await this._clearInsightCache(userId);
      }
      return createdTx;
    }

    // If no specific recurringId, execute overdue ones
    return this.processUserRecurringTransactions(userId);
  }

  /**
   * Internal helper to execute a claimed rule and update account balance.
   */
  async _executeRecurringRule(rule, executionDate) {
    const userId = rule.userId;
    const account = await Account.findOne({ _id: rule.accountId, userId });

    if (!account) {
      console.warn(`[UserCronManager] Account ${rule.accountId} not found for rule ${rule._id}. Pausing rule.`);
      rule.status = 'PAUSED';
      await rule.save();
      await this.syncUserCron(userId);
      return null;
    }

    let toAccount = null;
    let targetToAmount = undefined;
    let effectiveRate = rule.exchangeRate || 1.0;

    if (rule.type === 'TRANSFER') {
      toAccount = await Account.findOne({ _id: rule.toAccountId, userId });
      if (!toAccount) {
        console.warn(`[UserCronManager] Destination account ${rule.toAccountId} not found for rule ${rule._id}. Pausing rule.`);
        rule.status = 'PAUSED';
        await rule.save();
        await this.syncUserCron(userId);
        return null;
      }

      if (account.currency === toAccount.currency) {
        targetToAmount = Number(rule.amount);
        effectiveRate = 1.0;
      } else {
        effectiveRate = rule.exchangeRate || 1.0;
        targetToAmount = Number((Number(rule.amount) * effectiveRate).toFixed(2));
      }
    } else {
      if (rule.currency === account.currency) {
        effectiveRate = 1.0;
      }
    }

    const transaction = new Transaction({
      userId,
      accountId: rule.accountId,
      toAccountId: rule.type === 'TRANSFER' ? rule.toAccountId : undefined,
      categoryId: rule.type !== 'TRANSFER' ? rule.categoryId : undefined,
      type: rule.type,
      amount: Number(rule.amount),
      currency: rule.currency || account.currency,
      toAmount: rule.type === 'TRANSFER' ? targetToAmount : undefined,
      toCurrency: rule.type === 'TRANSFER' ? toAccount.currency : undefined,
      shouldConvert: true,
      exchangeRate: effectiveRate,
      date: executionDate,
      note: rule.note || (rule.type === 'TRANSFER' ? 'Recurring Transfer' : 'Recurring Transaction'),
      description: rule.description || `Auto-generated instance (${rule.frequency})`,
      recurringTransactionId: rule._id,
      isRecurringInstance: true
    });

    await transaction.save();

    // Atomic balance updates
    if (rule.type === 'INCOME') {
      const balanceEffect = (rule.currency === account.currency)
        ? Number(rule.amount)
        : Number((Number(rule.amount) * effectiveRate).toFixed(2));
      await Account.updateOne({ _id: account._id, userId }, { $inc: { balance: balanceEffect } });
    } else if (rule.type === 'EXPENSE') {
      const balanceEffect = (rule.currency === account.currency)
        ? Number(rule.amount)
        : Number((Number(rule.amount) * effectiveRate).toFixed(2));
      await Account.updateOne({ _id: account._id, userId }, { $inc: { balance: -balanceEffect } });
    } else if (rule.type === 'TRANSFER') {
      await Account.updateOne({ _id: account._id, userId }, { $inc: { balance: -Number(rule.amount) } });
      await Account.updateOne({ _id: toAccount._id, userId }, { $inc: { balance: targetToAmount } });
    }

    return transaction;
  }

  async _clearInsightCache(userId) {
    try {
      if (mongoose.models.InsightCache) {
        await mongoose.model('InsightCache').deleteMany({ userId });
      }
    } catch (_) {}
  }
}

const userCronManager = new UserCronManager();
export default userCronManager;
