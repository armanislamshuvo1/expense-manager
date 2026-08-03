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

export const syncTransactions = async (req, res, next) => {
  const { ops } = req.body;
  if (!ops || !Array.isArray(ops)) {
    return res.status(400).json({ success: false, message: 'Invalid sync operations format.' });
  }

  const userId = req.user.id;
  const baseCurrency = req.user?.baseCurrency || 'MYR';
  const idMap = {};
  const processedOps = [];

  // We attempt a database transaction if supported, else run sequentially
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (e) {
    session = null;
  }

  try {
    if (session) {
      session.startTransaction();
    }

    for (const op of ops) {
      const { type, clientTxId, id, data } = op;

      if (type === 'CREATE') {
        if (!clientTxId) continue;
        
        let existingTx = await Transaction.findOne({ clientTxId, userId }).session(session);
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

        const account = await Account.findOne({ _id: accountId, userId }).session(session);
        if (!account) throw new Error(`Source account not found for sync operation CREATE.`);

        let toAccount = null;
        if (txType === 'TRANSFER') {
          toAccount = await Account.findOne({ _id: toAccountId, userId }).session(session);
          if (!toAccount) throw new Error(`Destination account not found for sync operation CREATE.`);
        }

        const transaction = new Transaction({
          userId,
          accountId,
          toAccountId: txType === 'TRANSFER' ? toAccountId : undefined,
          categoryId: txType !== 'TRANSFER' ? categoryId : undefined,
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

        await transaction.save({ session });

        if (txType === 'INCOME') {
          const effect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
          account.balance += effect;
          await account.save({ session });
        } else if (txType === 'EXPENSE') {
          const effect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
          account.balance -= effect;
          await account.save({ session });
        } else if (txType === 'TRANSFER') {
          const fromEffect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
          const toEffect = getBalanceEffectForAccount(transaction, toAccount.currency, baseCurrency);
          account.balance -= fromEffect;
          toAccount.balance += toEffect;
          await account.save({ session });
          await toAccount.save({ session });
        }

        idMap[clientTxId] = transaction._id;
        processedOps.push({ clientTxId, status: 'CREATED', id: transaction._id });

      } else if (type === 'UPDATE') {
        const query = (id && mongoose.Types.ObjectId.isValid(id)) 
          ? { _id: id, userId } 
          : { clientTxId: id || clientTxId, userId };
        const transaction = await Transaction.findOne(query).session(session);
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

        const oldSourceAccount = await Account.findOne({ _id: transaction.accountId, userId }).session(session);
        if (oldSourceAccount) {
          const oldFromEffect = getBalanceEffectForAccount(transaction, oldSourceAccount.currency, baseCurrency);
          if (transaction.type === 'INCOME') {
            oldSourceAccount.balance -= oldFromEffect;
          } else if (transaction.type === 'EXPENSE') {
            oldSourceAccount.balance += oldFromEffect;
          } else if (transaction.type === 'TRANSFER') {
            oldSourceAccount.balance += oldFromEffect;
            const oldDestAccount = await Account.findOne({ _id: transaction.toAccountId, userId }).session(session);
            if (oldDestAccount) {
              const oldToEffect = getBalanceEffectForAccount(transaction, oldDestAccount.currency, baseCurrency);
              oldDestAccount.balance -= oldToEffect;
              await oldDestAccount.save({ session });
            }
          }
          await oldSourceAccount.save({ session });
        }

        const newSourceAccount = await Account.findOne({ _id: accountId, userId }).session(session);
        if (!newSourceAccount) throw new Error(`Source account not found for sync operation UPDATE.`);

        const tempTx = {
          amount: Number(amount),
          currency,
          shouldConvert: shouldConvert !== undefined ? shouldConvert : true,
          exchangeRate: exchangeRate !== undefined ? Number(exchangeRate) : 1.0
        };

        if (txType === 'INCOME') {
          const newEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, baseCurrency);
          newSourceAccount.balance += newEffect;
          await newSourceAccount.save({ session });
        } else if (txType === 'EXPENSE') {
          const newEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, baseCurrency);
          newSourceAccount.balance -= newEffect;
          await newSourceAccount.save({ session });
        } else if (txType === 'TRANSFER') {
          const newDestAccount = await Account.findOne({ _id: toAccountId, userId }).session(session);
          if (!newDestAccount) throw new Error(`Destination account not found for sync operation UPDATE.`);
          
          const newFromEffect = getBalanceEffectForAccount(tempTx, newSourceAccount.currency, baseCurrency);
          const newToEffect = getBalanceEffectForAccount(tempTx, newDestAccount.currency, baseCurrency);
          
          newSourceAccount.balance -= newFromEffect;
          newDestAccount.balance += newToEffect;
          
          await newSourceAccount.save({ session });
          await newDestAccount.save({ session });
        }

        transaction.accountId = accountId;
        transaction.toAccountId = txType === 'TRANSFER' ? toAccountId : undefined;
        transaction.categoryId = txType !== 'TRANSFER' ? categoryId : undefined;
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

        await transaction.save({ session });
        processedOps.push({ clientTxId, status: 'UPDATED', id: transaction._id });

      } else if (type === 'DELETE') {
        const query = (id && mongoose.Types.ObjectId.isValid(id)) 
          ? { _id: id, userId } 
          : { clientTxId: id || clientTxId, userId };
        const transaction = await Transaction.findOne(query).session(session);
        if (!transaction) continue;

        const account = await Account.findOne({ _id: transaction.accountId, userId }).session(session);
        if (account) {
          if (transaction.type === 'INCOME') {
            const effect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
            account.balance -= effect;
            await account.save({ session });
          } else if (transaction.type === 'EXPENSE') {
            const effect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
            account.balance += effect;
            await account.save({ session });
          } else if (transaction.type === 'TRANSFER') {
            const fromEffect = getBalanceEffectForAccount(transaction, account.currency, baseCurrency);
            account.balance += fromEffect;
            await account.save({ session });

            const toAccount = await Account.findOne({ _id: transaction.toAccountId, userId }).session(session);
            if (toAccount) {
              const toEffect = getBalanceEffectForAccount(transaction, toAccount.currency, baseCurrency);
              toAccount.balance -= toEffect;
              await toAccount.save({ session });
            }
          }
        }

        await transaction.deleteOne({ session });
        processedOps.push({ clientTxId, status: 'DELETED', id: transaction._id });
      }
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    res.status(200).json({ success: true, idMap, processedOps });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
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

