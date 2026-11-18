import RecurringTransaction from '../models/RecurringTransaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import userCronManager, { calculateNextRunDate } from '../services/userCronManager.js';

/**
 * List all recurring transactions for the authenticated user.
 */
export const getRecurringTransactions = async (req, res, next) => {
  try {
    const list = await RecurringTransaction.find({ userId: req.user.id })
      .populate('accountId', 'name currency type')
      .populate('toAccountId', 'name currency type')
      .populate('categoryId', 'name emoji color')
      .sort({ createdAt: -1 });

    const activeRule = (Array.isArray(list) ? list.find(r => r.status === 'ACTIVE') : null) || (Array.isArray(list) ? list[0] : null) || null;

    res.status(200).json({
      success: true,
      data: list,
      items: list,
      activeRule
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single recurring transaction by ID.
 */
export const getRecurringTransactionById = async (req, res, next) => {
  try {
    const item = await RecurringTransaction.findOne({
      _id: req.params.id,
      userId: req.user.id
    })
      .populate('accountId', 'name currency type')
      .populate('toAccountId', 'name currency type')
      .populate('categoryId', 'name emoji color');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Recurring transaction not found.' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new recurring transaction rule.
 */
export const createRecurringTransaction = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const {
      accountId,
      toAccountId,
      categoryId,
      type,
      amount,
      currency,
      frequency = 'DAILY',
      startDate,
      executionTime,
      note,
      description,
      exchangeRate
    } = req.body;

    if (!accountId || !type || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields or invalid amount.'
      });
    }

    const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY'];
    if (!validFrequencies.includes(String(frequency).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid frequency. Allowed: DAILY, WEEKLY, MONTHLY'
      });
    }

    const normFreq = String(frequency).toUpperCase();

    if (type === 'TRANSFER') {
      if (!toAccountId) {
        return res.status(400).json({
          success: false,
          message: 'Destination account is required for TRANSFER.'
        });
      }
      if (accountId.toString() === toAccountId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Source and destination accounts must be different.'
        });
      }
    } else if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category is required for INCOME and EXPENSE.'
      });
    }

    // Enforce at most 1 active recurring cron job per user
    const existingActive = await RecurringTransaction.findOne({ userId, status: 'ACTIVE' });
    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: 'A recurring transaction is already active for this user. Only 1 recurring cron job is permitted per user.',
        existingId: existingActive._id
      });
    }

    // Verify source account exists and belongs to user
    const account = await Account.findOne({ _id: accountId, userId: req.user.id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Source account not found.' });
    }

    // Verify destination account if TRANSFER
    if (type === 'TRANSFER') {
      const toAccount = await Account.findOne({ _id: toAccountId, userId: req.user.id });
      if (!toAccount) {
        return res.status(404).json({ success: false, message: 'Destination account not found.' });
      }
    } else {
      // Verify category exists
      const category = await Category.findOne({ _id: categoryId, userId: req.user.id });
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found.' });
      }
    }

    const now = new Date();
    // Use user-provided executionTime or default to creation time (HH:mm)
    let execTime = executionTime;
    if (!execTime || typeof execTime !== 'string' || !execTime.includes(':')) {
      execTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    const [execHours, execMinutes] = execTime.split(':').map(Number);

    const start = startDate ? new Date(startDate) : new Date(now.getTime());
    if (!isNaN(execHours) && !isNaN(execMinutes)) {
      start.setHours(execHours, execMinutes, 0, 0);
    }

    let nextRun;
    if (start > now) {
      nextRun = start;
    } else {
      nextRun = calculateNextRunDate(start, normFreq, execTime);
      while (nextRun <= now) {
        const currentNextRun = nextRun;
        nextRun = calculateNextRunDate(nextRun, normFreq, execTime);
        if (nextRun <= currentNextRun) {
          break;
        }
      }
    }

    const recurringTx = new RecurringTransaction({
      userId: req.user.id,
      accountId,
      toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
      categoryId: type !== 'TRANSFER' ? categoryId : undefined,
      type,
      amount: Number(amount),
      currency: currency || account.currency,
      exchangeRate: exchangeRate !== undefined && Number(exchangeRate) > 0 ? Number(exchangeRate) : 1.0,
      frequency: normFreq,
      executionTime: execTime,
      status: 'ACTIVE',
      startDate: start,
      nextRunDate: nextRun,
      note,
      description
    });

    await recurringTx.save();

    // Sync user cron runner - guarantees at most 1 cron runner in RAM
    await userCronManager.syncUserCron(req.user.id);

    res.status(201).json({
      success: true,
      message: 'Recurring transaction created successfully.',
      data: recurringTx
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A recurring transaction is already active for this user. Only 1 recurring cron job is permitted per user.'
      });
    }
    next(error);
  }
};

/**
 * Update recurring transaction rule.
 */
export const updateRecurringTransaction = async (req, res, next) => {
  try {
    const item = await RecurringTransaction.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Recurring transaction not found.' });
    }

    const {
      accountId,
      toAccountId,
      categoryId,
      type,
      amount,
      currency,
      frequency,
      executionTime,
      startDate,
      status,
      note,
      description,
      exchangeRate
    } = req.body;

    if (frequency && !['DAILY', 'WEEKLY', 'MONTHLY'].includes(String(frequency).toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid frequency.' });
    }

    if (amount !== undefined && Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });
    }

    // Ownership verification for account, toAccountId, and categoryId
    if (accountId) {
      const acc = await Account.findOne({ _id: accountId, userId: req.user.id });
      if (!acc) {
        return res.status(404).json({ success: false, message: 'Source account not found.' });
      }
      item.accountId = accountId;
    }

    if (toAccountId) {
      const toAcc = await Account.findOne({ _id: toAccountId, userId: req.user.id });
      if (!toAcc) {
        return res.status(404).json({ success: false, message: 'Destination account not found.' });
      }
      item.toAccountId = toAccountId;
    }

    if (categoryId) {
      const cat = await Category.findOne({ _id: categoryId, userId: req.user.id });
      if (!cat) {
        return res.status(404).json({ success: false, message: 'Category not found.' });
      }
      item.categoryId = categoryId;
    }

    // Verify transfer source and destination accounts differ
    const finalAccountId = (accountId || item.accountId)?.toString();
    const finalToAccountId = (toAccountId || item.toAccountId)?.toString();
    const targetType = type || item.type;
    if (targetType === 'TRANSFER') {
      if (finalAccountId && finalToAccountId && finalAccountId === finalToAccountId) {
        return res.status(400).json({
          success: false,
          message: 'Source and destination accounts must be different.'
        });
      }
    }

    if (type) {
      item.type = type;
      if (type === 'TRANSFER') {
        item.categoryId = undefined;
      } else {
        item.toAccountId = undefined;
      }
    }
    if (amount !== undefined) item.amount = Number(amount);
    if (currency) item.currency = currency;
    if (exchangeRate !== undefined && exchangeRate !== null && Number(exchangeRate) > 0) {
      item.exchangeRate = Number(exchangeRate);
    }
    if (note !== undefined) item.note = note;
    if (description !== undefined) item.description = description;

    let recalculateSchedule = false;
    if (executionTime !== undefined && executionTime !== item.executionTime) {
      item.executionTime = executionTime;
      recalculateSchedule = true;
    }
    if (frequency && String(frequency).toUpperCase() !== item.frequency) {
      item.frequency = String(frequency).toUpperCase();
      recalculateSchedule = true;
    }
    if (startDate) {
      item.startDate = new Date(startDate);
      recalculateSchedule = true;
    }

    if (recalculateSchedule) {
      const now = new Date();
      const normFreq = String(item.frequency || '').toUpperCase();
      const baseDate = new Date(item.startDate || now);
      if (item.executionTime && typeof item.executionTime === 'string' && item.executionTime.includes(':')) {
        const [h, m] = item.executionTime.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          baseDate.setHours(h, m, 0, 0);
        }
      }
      let nextRun;
      if (baseDate > now) {
        nextRun = baseDate;
      } else {
        nextRun = calculateNextRunDate(baseDate, normFreq, item.executionTime);
        while (nextRun <= now) {
          const currentNextRun = nextRun;
          nextRun = calculateNextRunDate(nextRun, normFreq, item.executionTime);
          if (nextRun <= currentNextRun) {
            break;
          }
        }
      }
      item.nextRunDate = nextRun;
    }

    if (status && ['ACTIVE', 'PAUSED', 'COMPLETED'].includes(status)) {
      if (status === 'ACTIVE' && item.status !== 'ACTIVE') {
        const existingActive = await RecurringTransaction.findOne({
          userId: req.user.id,
          status: 'ACTIVE',
          _id: { $ne: item._id }
        });
        if (existingActive) {
          return res.status(409).json({
            success: false,
            message: 'A recurring transaction is already active for this user. Only 1 recurring cron job is permitted per user.',
            existingId: existingActive._id
          });
        }
        if (item.nextRunDate <= new Date()) {
          const now = new Date();
          const normFreq = String(item.frequency || '').toUpperCase();
          const baseDate = new Date(now.getTime());
          if (item.executionTime && typeof item.executionTime === 'string' && item.executionTime.includes(':')) {
            const [h, m] = item.executionTime.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) {
              baseDate.setHours(h, m, 0, 0);
            }
          }
          let nextRun;
          if (baseDate > now) {
            nextRun = baseDate;
          } else {
            nextRun = calculateNextRunDate(baseDate, normFreq, item.executionTime);
            while (nextRun <= now) {
              const currentNextRun = nextRun;
              nextRun = calculateNextRunDate(nextRun, normFreq, item.executionTime);
              if (nextRun <= currentNextRun) {
                break;
              }
            }
          }
          item.nextRunDate = nextRun;
        }
      }
      item.status = status;
    }

    await item.save();
    await userCronManager.syncUserCron(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Recurring transaction updated successfully.',
      data: item
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A recurring transaction is already active for this user. Only 1 recurring cron job is permitted per user.'
      });
    }
    next(error);
  }
};

/**
 * Toggle recurring transaction active/paused status.
 */
export const toggleRecurringTransactionStatus = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const item = await RecurringTransaction.findOne({
      _id: req.params.id,
      userId
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Recurring transaction not found.' });
    }

    if (item.status === 'PAUSED') {
      const otherActive = await RecurringTransaction.findOne({
        userId,
        status: 'ACTIVE',
        _id: { $ne: item._id }
      });
      if (otherActive) {
        return res.status(409).json({
          success: false,
          message: 'A recurring transaction is already active for this user. Only 1 recurring cron job is permitted per user.',
          existingId: otherActive._id
        });
      }
      item.status = 'ACTIVE';
      if (item.nextRunDate <= new Date()) {
        const now = new Date();
        const normFreq = String(item.frequency || '').toUpperCase();
        const baseDate = new Date(now.getTime());
        if (item.executionTime && typeof item.executionTime === 'string' && item.executionTime.includes(':')) {
          const [h, m] = item.executionTime.split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) {
            baseDate.setHours(h, m, 0, 0);
          }
        }
        let nextRun;
        if (baseDate > now) {
          nextRun = baseDate;
        } else {
          nextRun = calculateNextRunDate(baseDate, normFreq, item.executionTime);
          while (nextRun <= now) {
            const currentNextRun = nextRun;
            nextRun = calculateNextRunDate(nextRun, normFreq, item.executionTime);
            if (nextRun <= currentNextRun) {
              break;
            }
          }
        }
        item.nextRunDate = nextRun;
      }
    } else {
      item.status = 'PAUSED';
    }

    await item.save();
    await userCronManager.syncUserCron(userId);

    res.status(200).json({
      success: true,
      message: `Recurring transaction ${item.status === 'ACTIVE' ? 'resumed' : 'paused'}.`,
      data: item,
      status: item.status
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A recurring transaction is already active for this user. Only 1 recurring cron job is permitted per user.'
      });
    }
    next(error);
  }
};

export const toggleRecurringTransaction = toggleRecurringTransactionStatus;

/**
 * Delete recurring transaction.
 */
export const deleteRecurringTransaction = async (req, res, next) => {
  try {
    const item = await RecurringTransaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Recurring transaction not found.' });
    }

    await userCronManager.syncUserCron(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Recurring transaction deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger immediate execution ("Run Now").
 */
export const runNowRecurringTransaction = async (req, res, next) => {
  try {
    const recurringId = req.params.id || req.body.recurringId || req.body.id;
    const result = await userCronManager.runNowForUser(req.user.id, recurringId);

    if (recurringId && !result) {
      return res.status(404).json({
        success: false,
        message: 'Active recurring rule not found or execution failed.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Recurring schedule executed',
      transaction: result,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
