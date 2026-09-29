import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';

const getBalanceEffectForAccount = (transaction, accountCurrency, baseCurrency) => {
  if (transaction.currency === accountCurrency) {
    return transaction.amount;
  }
  return transaction.shouldConvert 
    ? (transaction.amount * transaction.exchangeRate) 
    : transaction.amount;
};

// Defensive helper to resolve an Account by Mongo ObjectId, clientAccId, or Name
const resolveAccount = async (accIdentifier, userId) => {
  if (!accIdentifier) return null;
  if (mongoose.Types.ObjectId.isValid(accIdentifier)) {
    const acc = await Account.findOne({ _id: accIdentifier, userId });
    if (acc) return acc;
  }
  return await Account.findOne({
    userId,
    $or: [
      { clientAccId: accIdentifier },
      { name: accIdentifier }
    ]
  });
};

// Defensive helper to resolve a Category by Mongo ObjectId, clientCatId, or Name
const resolveCategory = async (catIdentifier, userId) => {
  if (!catIdentifier) return null;
  if (mongoose.Types.ObjectId.isValid(catIdentifier)) {
    const cat = await Category.findOne({ _id: catIdentifier, userId });
    if (cat) return cat;
  }
  return await Category.findOne({
    userId,
    $or: [
      { clientCatId: catIdentifier },
      { name: catIdentifier }
    ]
  });
};

export const syncTransactions = async (req, res, next) => {
  const { ops } = req.body;
  if (!ops || !Array.isArray(ops)) {
    return res.status(400).json({ success: false, message: 'Invalid sync operations format.' });
  }

  const userId = req.user.id;
  const baseCurrency = req.user?.baseCurrency || 'MYR';
  const idMap = {};
  const processedOps = [];

  try {
    for (const op of ops) {
      const { type, clientTxId, id, data } = op;

      if (type === 'CREATE') {
        if (!clientTxId) continue;
        
        let existingTx = await Transaction.findOne({ clientTxId, userId });
        if (existingTx) {
          idMap[clientTxId] = existingTx._id;
          processedOps.push({ clientTxId, status: 'SKIPPED_DUPLICATE', id: existingTx._id });
          continue;
        }

        const {
          accountId,
          toAccountId,
          categoryId,
          type: txType,
          amount,
          currency,
          shouldConvert,
          exchangeRate,
          date,
          note,
          description
        } = data;

        const account = await resolveAccount(accountId, userId);
        if (!account) throw new Error(`Source account not found for sync operation CREATE.`);

        let toAccount = null;
        if (txType === 'TRANSFER') {
          toAccount = await resolveAccount(toAccountId, userId);
          if (!toAccount) throw new Error(`Destination account not found for sync operation CREATE.`);
        }

        let resolvedCategoryId = undefined;
        if (txType !== 'TRANSFER' && categoryId) {
          const cat = await resolveCategory(categoryId, userId);
          resolvedCategoryId = cat ? cat._id : undefined;
        }

        const transaction = new Transaction({
          userId,
          accountId: account._id,
          toAccountId: txType === 'TRANSFER' && toAccount ? toAccount._id : undefined,
          categoryId: txType !== 'TRANSFER' ? resolvedCategoryId : undefined,
          type: txType,
          amount,
          currency,
          shouldConvert: shouldConvert !== undefined ? shouldConvert : true,
          exchangeRate: exchangeRate !== undefined ? exchangeRate : 1.0,
          date,
          note,
          description,
          clientTxId
        });

        if (transaction.shouldConvert) {
          transaction.convertedAmount = Number((transaction.amount * transaction.exchangeRate).toFixed(2));
        } else {
          transaction.convertedAmount = transaction.amount;
        }

        await transaction.save();

        if (txType === 'INCOME') {
          const effect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
          await Account.updateOne({ _id: account._id }, { $inc: { balance: effect } });
        } else if (txType === 'EXPENSE') {
          const effect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
          await Account.updateOne({ _id: account._id }, { $inc: { balance: -effect } });
        } else if (txType === 'TRANSFER') {
          const fromEffect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
          const toEffect = getBalanceEffectForAccount(transaction, toAccount.currency, baseCurrency);
          await Account.updateOne({ _id: account._id }, { $inc: { balance: -fromEffect } });
          await Account.updateOne({ _id: toAccount._id }, { $inc: { balance: toEffect } });
        }

        idMap[clientTxId] = transaction._id;
        processedOps.push({ clientTxId, status: 'CREATED', id: transaction._id });

      } else if (type === 'UPDATE') {
        const query = (id && mongoose.Types.ObjectId.isValid(id)) 
          ? { _id: id, userId } 
          : { clientTxId: id || clientTxId, userId };
        const transaction = await Transaction.findOne(query);
        if (!transaction) continue;

        const {
          accountId,
          toAccountId,
          categoryId,
          type: txType,
          amount,
          currency,
          shouldConvert,
          exchangeRate,
          date,
          note,
          description
        } = data;

        const oldSourceAccount = await Account.findOne({ _id: transaction.accountId, userId });
        if (oldSourceAccount) {
          const oldFromEffect = getBalanceEffectForAccount(transaction, oldSourceAccount.currency, baseCurrency);
          if (transaction.type === 'INCOME') {
            await Account.updateOne({ _id: oldSourceAccount._id }, { $inc: { balance: -oldFromEffect } });
          } else if (transaction.type === 'EXPENSE') {
            await Account.updateOne({ _id: oldSourceAccount._id }, { $inc: { balance: oldFromEffect } });
          } else if (transaction.type === 'TRANSFER') {
            await Account.updateOne({ _id: oldSourceAccount._id }, { $inc: { balance: oldFromEffect } });
            const oldDestAccount = await Account.findOne({ _id: transaction.toAccountId, userId });
            if (oldDestAccount) {
              const oldToEffect = getBalanceEffectForAccount(transaction, oldDestAccount.currency, baseCurrency);
              await Account.updateOne({ _id: oldDestAccount._id }, { $inc: { balance: -oldToEffect } });
            }
          }
        }

        const newSourceAccount = await resolveAccount(accountId, userId);
        if (!newSourceAccount) throw new Error(`Source account not found for sync operation UPDATE.`);

        const tempTx = {
          amount: Number(amount),
          currency,
          shouldConvert: shouldConvert !== undefined ? shouldConvert : true,
          exchangeRate: exchangeRate !== undefined ? Number(exchangeRate) : 1.0
        };

        let newDestAccount = null;
        if (txType === 'INCOME') {
          const newEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, baseCurrency);
          await Account.updateOne({ _id: newSourceAccount._id }, { $inc: { balance: newEffect } });
        } else if (txType === 'EXPENSE') {
          const newEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, baseCurrency);
          await Account.updateOne({ _id: newSourceAccount._id }, { $inc: { balance: -newEffect } });
        } else if (txType === 'TRANSFER') {
          newDestAccount = await resolveAccount(toAccountId, userId);
          if (!newDestAccount) throw new Error(`Destination account not found for sync operation UPDATE.`);
          
          const newFromEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, baseCurrency);
          const newToEffect = getBalanceEffectForAccount(tempTx, newDestAccount.currency, baseCurrency);
          
          await Account.updateOne({ _id: newSourceAccount._id }, { $inc: { balance: -newFromEffect } });
          await Account.updateOne({ _id: newDestAccount._id }, { $inc: { balance: newToEffect } });
        }

        let resolvedUpdateCatId = undefined;
        if (txType !== 'TRANSFER' && categoryId) {
          const cat = await resolveCategory(categoryId, userId);
          resolvedUpdateCatId = cat ? cat._id : undefined;
        }

        transaction.accountId = newSourceAccount._id;
        transaction.toAccountId = txType === 'TRANSFER' && newDestAccount ? newDestAccount._id : undefined;
        transaction.categoryId = txType !== 'TRANSFER' ? resolvedUpdateCatId : undefined;
        transaction.type = txType;
        transaction.amount = Number(amount);
        transaction.currency = currency;
        transaction.shouldConvert = shouldConvert !== undefined ? shouldConvert : true;
        transaction.exchangeRate = exchangeRate !== undefined ? Number(exchangeRate) : 1.0;
        if (date) transaction.date = date;
        transaction.note = note;
        transaction.description = description;

        if (transaction.shouldConvert) {
          transaction.convertedAmount = Number((transaction.amount * transaction.exchangeRate).toFixed(2));
        } else {
          transaction.convertedAmount = transaction.amount;
        }

        await transaction.save();
        processedOps.push({ clientTxId, status: 'UPDATED', id: transaction._id });

      } else if (type === 'DELETE') {
        const query = (id && mongoose.Types.ObjectId.isValid(id)) 
          ? { _id: id, userId } 
          : { clientTxId: id || clientTxId, userId };
        const transaction = await Transaction.findOne(query);
        if (!transaction) continue;

        const account = await Account.findOne({ _id: transaction.accountId, userId });
        if (account) {
          if (transaction.type === 'INCOME') {
            const effect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
            await Account.updateOne({ _id: account._id }, { $inc: { balance: -effect } });
          } else if (transaction.type === 'EXPENSE') {
            const effect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
            await Account.updateOne({ _id: account._id }, { $inc: { balance: effect } });
          } else if (transaction.type === 'TRANSFER') {
            const fromEffect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
            await Account.updateOne({ _id: account._id }, { $inc: { balance: fromEffect } });

            const toAccount = await Account.findOne({ _id: transaction.toAccountId, userId });
            if (toAccount) {
              const toEffect = getBalanceEffectForAccount(transaction, toAccount.currency, baseCurrency);
              await Account.updateOne({ _id: toAccount._id }, { $inc: { balance: -toEffect } });
            }
          }
        }

        await transaction.deleteOne();
        processedOps.push({ clientTxId, status: 'DELETED', id: transaction._id });
      }
    }

    // Fetch and return the latest account states so clients receive updated balances immediately
    const updatedAccounts = await Account.find({ userId });
    res.status(200).json({ success: true, idMap, processedOps, accounts: updatedAccounts });
  } catch (error) {
    next(error);
  }
};

export const syncCategories = async (req, res, next) => {
  const { ops } = req.body;
  if (!ops || !Array.isArray(ops)) {
    return res.status(400).json({ success: false, message: 'Invalid sync operations format.' });
  }

  const userId = req.user.id;
  const idMap = {};
  const processedOps = [];

  try {
    for (const op of ops) {
      const { type, clientCatId, id, data } = op;

      if (type === 'CREATE') {
        if (!clientCatId) continue;

        let existingCat = await Category.findOne({ clientCatId, userId });
        if (!existingCat && data?.name) {
          existingCat = await Category.findOne({ name: data.name, type: data.type || 'EXPENSE', userId });
        }

        if (existingCat) {
          idMap[clientCatId] = existingCat._id;
          processedOps.push({ clientCatId, status: 'SKIPPED_DUPLICATE', id: existingCat._id });
          continue;
        }

        const category = new Category({
          userId,
          name: data.name,
          emoji: data.emoji || '',
          color: data.color || '#94a3b8',
          type: data.type || 'EXPENSE',
          clientCatId
        });

        await category.save();
        idMap[clientCatId] = category._id;
        processedOps.push({ clientCatId, status: 'CREATED', id: category._id });

      } else if (type === 'UPDATE') {
        const query = (id && mongoose.Types.ObjectId.isValid(id))
          ? { _id: id, userId }
          : { clientCatId: id || clientCatId, userId };

        const category = await Category.findOne(query);
        if (!category) continue;

        if (data.name) category.name = data.name;
        if (data.emoji !== undefined) category.emoji = data.emoji;
        if (data.color) category.color = data.color;
        if (data.type) category.type = data.type;

        await category.save();
        processedOps.push({ clientCatId, status: 'UPDATED', id: category._id });

      } else if (type === 'DELETE') {
        const query = (id && mongoose.Types.ObjectId.isValid(id))
          ? { _id: id, userId }
          : { clientCatId: id || clientCatId, userId };

        const category = await Category.findOne(query);
        if (category) {
          await category.deleteOne();
          processedOps.push({ clientCatId, status: 'DELETED', id: category._id });
        }
      }
    }

    res.status(200).json({ success: true, idMap, processedOps });
  } catch (error) {
    next(error);
  }
};

export const syncAccounts = async (req, res, next) => {
  const { ops } = req.body;
  if (!ops || !Array.isArray(ops)) {
    return res.status(400).json({ success: false, message: 'Invalid sync operations format.' });
  }

  const userId = req.user.id;
  const idMap = {};
  const processedOps = [];

  try {
    for (const op of ops) {
      const { type, clientAccId, id, data } = op;

      if (type === 'CREATE') {
        if (!clientAccId) continue;

        let existingAcc = await Account.findOne({ clientAccId, userId });
        if (!existingAcc && data?.name) {
          existingAcc = await Account.findOne({ name: data.name, userId });
        }

        if (existingAcc) {
          idMap[clientAccId] = existingAcc._id;
          processedOps.push({ clientAccId, status: 'SKIPPED_DUPLICATE', id: existingAcc._id });
          continue;
        }

        const account = new Account({
          userId,
          name: data.name,
          type: data.type || 'CASH',
          balance: Number(data.balance) || 0,
          currency: data.currency || req.user?.baseCurrency || 'MYR',
          creditLimit: Number(data.creditLimit) || 0,
          clientAccId
        });

        await account.save();
        idMap[clientAccId] = account._id;
        processedOps.push({ clientAccId, status: 'CREATED', id: account._id });

      } else if (type === 'UPDATE') {
        const query = (id && mongoose.Types.ObjectId.isValid(id))
          ? { _id: id, userId }
          : { clientAccId: id || clientAccId, userId };

        const account = await Account.findOne(query);
        if (!account) continue;

        if (data.name) account.name = data.name;
        if (data.type) account.type = data.type;
        if (data.balance !== undefined) account.balance = Number(data.balance);
        if (data.currency) account.currency = data.currency;

        await account.save();
        processedOps.push({ clientAccId, status: 'UPDATED', id: account._id });

      } else if (type === 'DELETE') {
        const query = (id && mongoose.Types.ObjectId.isValid(id))
          ? { _id: id, userId }
          : { clientAccId: id || clientAccId, userId };

        const account = await Account.findOne(query);
        if (account) {
          await account.deleteOne();
          processedOps.push({ clientAccId, status: 'DELETED', id: account._id });
        }
      }
    }

    res.status(200).json({ success: true, idMap, processedOps });
  } catch (error) {
    next(error);
  }
};

