const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

const getBalanceEffectForAccount = (transaction, accountCurrency, baseCurrency) => {
  if (transaction.currency === accountCurrency) {
    return transaction.amount;
  }
  return transaction.shouldConvert 
    ? (transaction.amount * transaction.exchangeRate) 
    : transaction.amount;
};

exports.getTransactions = async (req, res, next) => {
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

exports.createTransaction = async (req, res, next) => {
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
    if (type === 'TRANSFER') {
      toAccount = await Account.findOne({ _id: toAccountId, userId: req.user.id });
      if (!toAccount) {
        return res.status(404).json({ success: false, message: 'Destination Account not found.' });
      }
    }

    // Save transaction
    const transaction = new Transaction({
      userId: req.user.id,
      accountId,
      toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
      categoryId: type !== 'TRANSFER' ? categoryId : undefined,
      type,
      amount,
      currency,
      shouldConvert: shouldConvert !== undefined ? shouldConvert : true,
      exchangeRate: exchangeRate !== undefined ? exchangeRate : 1.0,
      date,
      note,
      description
    });

    await transaction.save(); // Invokes pre-save middleware for conversion calculations

    // Adjust Account Balance
    if (type === 'INCOME') {
      const balanceEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
      account.balance += balanceEffect;
      await account.save();
    } else if (type === 'EXPENSE') {
      const balanceEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
      account.balance -= balanceEffect;
      await account.save();
    } else if (type === 'TRANSFER') {
      const fromEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
      const toEffect = getBalanceEffectForAccount(transaction, toAccount.currency, req.user?.baseCurrency || 'MYR');
      account.balance -= fromEffect;
      toAccount.balance += toEffect;
      await account.save();
      await toAccount.save();
    }

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const account = await Account.findOne({ _id: transaction.accountId, userId: req.user.id });
    if (account) {
      if (transaction.type === 'INCOME') {
        const balanceEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
        account.balance -= balanceEffect;
        await account.save();
      } else if (transaction.type === 'EXPENSE') {
        const balanceEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
        account.balance += balanceEffect;
        await account.save();
      } else if (transaction.type === 'TRANSFER') {
        const fromEffect = getBalanceEffectForAccount(transaction, account.currency, req.user?.baseCurrency || 'MYR');
        account.balance += fromEffect;
        await account.save();

        const toAccount = await Account.findOne({ _id: transaction.toAccountId, userId: req.user.id });
        if (toAccount) {
          const toEffect = getBalanceEffectForAccount(transaction, toAccount.currency, req.user?.baseCurrency || 'MYR');
          toAccount.balance -= toEffect;
          await toAccount.save();
        }
      }
    }

    await transaction.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

exports.updateTransaction = async (req, res, next) => {
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
      date, 
      note, 
      description 
    } = req.body;

    const oldTransaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!oldTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // 1. REVERT OLD TRANSACTION BALANCE EFFECT
    const oldSourceAccount = await Account.findOne({ _id: oldTransaction.accountId, userId: req.user.id });
    if (oldSourceAccount) {
      const oldFromEffect = getBalanceEffectForAccount(oldTransaction, oldSourceAccount.currency, req.user?.baseCurrency || 'MYR');
      if (oldTransaction.type === 'INCOME') {
        oldSourceAccount.balance -= oldFromEffect;
      } else if (oldTransaction.type === 'EXPENSE') {
        oldSourceAccount.balance += oldFromEffect;
      } else if (oldTransaction.type === 'TRANSFER') {
        oldSourceAccount.balance += oldFromEffect;
        const oldDestAccount = await Account.findOne({ _id: oldTransaction.toAccountId, userId: req.user.id });
        if (oldDestAccount) {
          const oldToEffect = getBalanceEffectForAccount(oldTransaction, oldDestAccount.currency, req.user?.baseCurrency || 'MYR');
          oldDestAccount.balance -= oldToEffect;
          await oldDestAccount.save();
        }
      }
      await oldSourceAccount.save();
    }

    // 2. APPLY NEW TRANSACTION BALANCE EFFECT
    const newSourceAccount = await Account.findOne({ _id: accountId, userId: req.user.id });
    if (!newSourceAccount) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    // Construct a temporary transaction object to calculate balance effects for the updated values
    const tempTx = {
      amount: Number(amount),
      currency,
      shouldConvert: shouldConvert !== undefined ? shouldConvert : true,
      exchangeRate: exchangeRate !== undefined ? Number(exchangeRate) : 1.0
    };

    if (type === 'INCOME') {
      const newEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, req.user?.baseCurrency || 'MYR');
      newSourceAccount.balance += newEffect;
      await newSourceAccount.save();
    } else if (type === 'EXPENSE') {
      const newEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, req.user?.baseCurrency || 'MYR');
      newSourceAccount.balance -= newEffect;
      await newSourceAccount.save();
    } else if (type === 'TRANSFER') {
      if (accountId.toString() === toAccountId.toString()) {
        return res.status(400).json({ success: false, message: 'Source and destination accounts must be different.' });
      }
      const newDestAccount = await Account.findOne({ _id: toAccountId, userId: req.user.id });
      if (!newDestAccount) {
        return res.status(404).json({ success: false, message: 'Destination Account not found.' });
      }
      const newFromEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, req.user?.baseCurrency || 'MYR');
      const newToEffect = getBalanceEffectForAccount(tempTx, newDestAccount.currency, req.user?.baseCurrency || 'MYR');
      
      newSourceAccount.balance -= newFromEffect;
      newDestAccount.balance += newToEffect;
      
      await newSourceAccount.save();
      await newDestAccount.save();
    }

    // 3. UPDATE TRANSACTION FIELDS
    oldTransaction.accountId = accountId;
    oldTransaction.toAccountId = type === 'TRANSFER' ? toAccountId : undefined;
    oldTransaction.categoryId = type !== 'TRANSFER' ? categoryId : undefined;
    oldTransaction.type = type;
    oldTransaction.amount = Number(amount);
    oldTransaction.currency = currency;
    oldTransaction.shouldConvert = shouldConvert !== undefined ? shouldConvert : true;
    oldTransaction.exchangeRate = exchangeRate !== undefined ? Number(exchangeRate) : 1.0;
    if (date) oldTransaction.date = date;
    oldTransaction.note = note;
    oldTransaction.description = description;

    await oldTransaction.save();

    res.status(200).json({ success: true, data: oldTransaction });
  } catch (error) {
    next(error);
  }
};

