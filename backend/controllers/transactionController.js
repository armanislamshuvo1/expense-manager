import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

const getBalanceEffectForAccount = (transaction, accountCurrency, baseCurrency) => {
  if (transaction.currency === accountCurrency) {
    return transaction.amount;
  }
  return transaction.shouldConvert 
    ? (transaction.amount * transaction.exchangeRate) 
    : transaction.amount;
};

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .populate('accountId')
      .populate('toAccountId')
      .populate('categoryId')
      .sort({ date: -1 });
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

export const createTransaction = async (req, res, next) => {
  try {
    const { 
      accountId, 
      toAccountId,
      categoryId, 
      type, 
      amount, 
      currency, 
      shouldConvert, 
      exchangeRate, 
      toAmount,
      toCurrency,
      date, 
      note, 
      description 
    } = req.body;

    if (!accountId || (type !== 'TRANSFER' && !categoryId) || (type === 'TRANSFER' && !toAccountId) || !type || amount === undefined || !date) {
      return res.status(400).json({ success: false, message: 'Missing required transaction fields.' });
    }

    if (type === 'TRANSFER' && accountId.toString() === toAccountId.toString()) {
      return res.status(400).json({ success: false, message: 'Source and destination accounts must be different.' });
    }

    const account = await Account.findOne({ _id: accountId, userId: req.user.id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    let toAccount = null;
    let targetToAmount = undefined;
    let effectiveRate = exchangeRate !== undefined && exchangeRate !== null && Number(exchangeRate) > 0 ? Number(exchangeRate) : 1.0;

    if (type === 'TRANSFER') {
      toAccount = await Account.findOne({ _id: toAccountId, userId: req.user.id });
      if (!toAccount) {
        return res.status(404).json({ success: false, message: 'Destination Account not found.' });
      }

      if (account.currency === toAccount.currency) {
        targetToAmount = Number(amount);
        effectiveRate = 1.0;
      } else {
        const hasToAmount = toAmount !== undefined && toAmount !== null && Number(toAmount) > 0;
        const hasExchangeRate = exchangeRate !== undefined && exchangeRate !== null && Number(exchangeRate) > 0;

        if (hasToAmount) {
          targetToAmount = Number(toAmount);
          if (!hasExchangeRate && Number(amount) > 0) {
            effectiveRate = Number((targetToAmount / Number(amount)).toFixed(6));
          }
        } else if (hasExchangeRate) {
          targetToAmount = Number((Number(amount) * Number(exchangeRate)).toFixed(2));
        } else {
          return res.status(400).json({
            success: false,
            message: 'Cross-currency transfer requires an exchange rate or destination amount.'
          });
        }
      }
    }

    // Save transaction
    const transaction = new Transaction({
      userId: req.user.id,
      accountId,
      toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
      categoryId: type !== 'TRANSFER' ? categoryId : undefined,
      type,
      amount: Number(amount),
      currency: currency || account.currency,
      toAmount: type === 'TRANSFER' ? targetToAmount : undefined,
      toCurrency: type === 'TRANSFER' ? toAccount.currency : undefined,
      shouldConvert: true,
      exchangeRate: effectiveRate,
      date,
      note,
      description
    });

    await transaction.save(); // Invokes pre-save middleware for conversion calculations

    // Adjust Account Balance using atomic $inc operator to eliminate race conditions
    if (type === 'INCOME') {
      const balanceEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
      await Account.updateOne({ _id: account._id, userId: req.user.id }, { $inc: { balance: balanceEffect } });
    } else if (type === 'EXPENSE') {
      const balanceEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
      await Account.updateOne({ _id: account._id, userId: req.user.id }, { $inc: { balance: -balanceEffect } });
    } else if (type === 'TRANSFER') {
      await Account.updateOne({ _id: account._id, userId: req.user.id }, { $inc: { balance: -Number(amount) } });
      await Account.updateOne({ _id: toAccount._id, userId: req.user.id }, { $inc: { balance: targetToAmount } });
    }

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const account = await Account.findOne({ _id: transaction.accountId, userId: req.user.id });
    if (account) {
      if (transaction.type === 'INCOME') {
        const balanceEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
        await Account.updateOne({ _id: account._id, userId: req.user.id }, { $inc: { balance: -balanceEffect } });
      } else if (transaction.type === 'EXPENSE') {
        const balanceEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
        await Account.updateOne({ _id: account._id, userId: req.user.id }, { $inc: { balance: balanceEffect } });
      } else if (transaction.type === 'TRANSFER') {
        await Account.updateOne({ _id: account._id, userId: req.user.id }, { $inc: { balance: Number(transaction.amount) } });

        const toAccount = await Account.findOne({ _id: transaction.toAccountId, userId: req.user.id });
        if (toAccount) {
          const toAmountToRevert = transaction.toAmount !== undefined && transaction.toAmount !== null
            ? transaction.toAmount
            : (transaction.currency !== toAccount.currency
                ? Number((transaction.amount * (transaction.exchangeRate || 1.0)).toFixed(2))
                : transaction.amount);
          await Account.updateOne({ _id: toAccount._id, userId: req.user.id }, { $inc: { balance: -toAmountToRevert } });
        }
      }
    }

    await transaction.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const { 
      accountId, 
      toAccountId, 
      categoryId, 
      type, 
      amount, 
      currency, 
      shouldConvert, 
      exchangeRate, 
      toAmount,
      toCurrency,
      date, 
      note, 
      description 
    } = req.body;

    const oldTransaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!oldTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (!accountId || (type !== 'TRANSFER' && !categoryId) || (type === 'TRANSFER' && !toAccountId) || !type || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required transaction fields.' });
    }

    if (type === 'TRANSFER' && accountId.toString() === toAccountId.toString()) {
      return res.status(400).json({ success: false, message: 'Source and destination accounts must be different.' });
    }

    const newSourceAccount = await Account.findOne({ _id: accountId, userId: req.user.id });
    if (!newSourceAccount) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    let newDestAccount = null;
    let targetToAmount = undefined;
    let effectiveRate = exchangeRate !== undefined && exchangeRate !== null && Number(exchangeRate) > 0 ? Number(exchangeRate) : 1.0;

    if (type === 'TRANSFER') {
      newDestAccount = await Account.findOne({ _id: toAccountId, userId: req.user.id });
      if (!newDestAccount) {
        return res.status(404).json({ success: false, message: 'Destination Account not found.' });
      }

      if (newSourceAccount.currency === newDestAccount.currency) {
        targetToAmount = Number(amount);
        effectiveRate = 1.0;
      } else {
        const hasToAmount = toAmount !== undefined && toAmount !== null && Number(toAmount) > 0;
        const hasExchangeRate = exchangeRate !== undefined && exchangeRate !== null && Number(exchangeRate) > 0;

        if (hasToAmount) {
          targetToAmount = Number(toAmount);
          if (!hasExchangeRate && Number(amount) > 0) {
            effectiveRate = Number((targetToAmount / Number(amount)).toFixed(6));
          }
        } else if (hasExchangeRate) {
          targetToAmount = Number((Number(amount) * Number(exchangeRate)).toFixed(2));
        } else {
          return res.status(400).json({
            success: false,
            message: 'Cross-currency transfer requires an exchange rate or destination amount.'
          });
        }
      }
    }

    // 1. REVERT OLD TRANSACTION BALANCE EFFECT
    const oldSourceAccount = await Account.findOne({ _id: oldTransaction.accountId, userId: req.user.id });
    if (oldSourceAccount) {
      if (oldTransaction.type === 'INCOME') {
        const oldFromEffect = getBalanceEffectForAccount(oldTransaction, oldSourceAccount.currency, req.user?.baseCurrency || 'MYR');
        await Account.updateOne({ _id: oldSourceAccount._id, userId: req.user.id }, { $inc: { balance: -oldFromEffect } });
      } else if (oldTransaction.type === 'EXPENSE') {
        const oldFromEffect = getBalanceEffectForAccount(oldTransaction, oldSourceAccount.currency, req.user?.baseCurrency || 'MYR');
        await Account.updateOne({ _id: oldSourceAccount._id, userId: req.user.id }, { $inc: { balance: oldFromEffect } });
      } else if (oldTransaction.type === 'TRANSFER') {
        await Account.updateOne({ _id: oldSourceAccount._id, userId: req.user.id }, { $inc: { balance: Number(oldTransaction.amount) } });
        const oldDestAccount = await Account.findOne({ _id: oldTransaction.toAccountId, userId: req.user.id });
        if (oldDestAccount) {
          const oldToRevert = oldTransaction.toAmount !== undefined && oldTransaction.toAmount !== null
            ? oldTransaction.toAmount
            : (oldTransaction.currency !== oldDestAccount.currency
                ? Number((oldTransaction.amount * (oldTransaction.exchangeRate || 1.0)).toFixed(2))
                : oldTransaction.amount);
          await Account.updateOne({ _id: oldDestAccount._id, userId: req.user.id }, { $inc: { balance: -oldToRevert } });
        }
      }
    }

    // 2. APPLY NEW TRANSACTION BALANCE EFFECT
    const tempTx = {
      amount: Number(amount),
      currency: currency || newSourceAccount.currency,
      shouldConvert: shouldConvert !== undefined ? shouldConvert : true,
      exchangeRate: effectiveRate
    };

    if (type === 'INCOME') {
      const newEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, req.user?.baseCurrency || 'MYR');
      await Account.updateOne({ _id: newSourceAccount._id, userId: req.user.id }, { $inc: { balance: newEffect } });
    } else if (type === 'EXPENSE') {
      const newEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, req.user?.baseCurrency || 'MYR');
      await Account.updateOne({ _id: newSourceAccount._id, userId: req.user.id }, { $inc: { balance: -newEffect } });
    } else if (type === 'TRANSFER') {
      await Account.updateOne({ _id: newSourceAccount._id, userId: req.user.id }, { $inc: { balance: -Number(amount) } });
      await Account.updateOne({ _id: newDestAccount._id, userId: req.user.id }, { $inc: { balance: targetToAmount } });
    }

    // 3. UPDATE TRANSACTION FIELDS
    oldTransaction.accountId = accountId;
    oldTransaction.toAccountId = type === 'TRANSFER' ? toAccountId : undefined;
    oldTransaction.categoryId = type !== 'TRANSFER' ? categoryId : undefined;
    oldTransaction.type = type;
    oldTransaction.amount = Number(amount);
    oldTransaction.currency = currency || newSourceAccount.currency;
    if (type === 'TRANSFER') {
      oldTransaction.toAmount = targetToAmount;
      oldTransaction.toCurrency = newDestAccount.currency;
      oldTransaction.shouldConvert = true;
      oldTransaction.exchangeRate = effectiveRate;
    } else {
      oldTransaction.toAmount = undefined;
      oldTransaction.toCurrency = undefined;
      oldTransaction.shouldConvert = shouldConvert !== undefined ? shouldConvert : true;
      oldTransaction.exchangeRate = effectiveRate;
    }
    if (date) oldTransaction.date = date;
    oldTransaction.note = note;
    oldTransaction.description = description;

    await oldTransaction.save();

    res.status(200).json({ success: true, data: oldTransaction });
  } catch (error) {
    next(error);
  }
};
