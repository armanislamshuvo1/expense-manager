const mongoose = require('mongoose');
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

exports.syncTransactions = async (req, res, next) => {
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
    // Session/Replica Set not supported, proceed without transaction session
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
        
        // 1. Idempotency Check
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

        // Fetch Accounts
        const account = await Account.findOne({ _id: accountId, userId }).session(session);
        if (!account) throw new Error(`Source account not found for sync operation CREATE.`);

        let toAccount = null;
        if (txType === 'TRANSFER') {
          toAccount = await Account.findOne({ _id: toAccountId, userId }).session(session);
          if (!toAccount) throw new Error(`Destination account not found for sync operation CREATE.`);
        }

        // Create transaction
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

        // Apply pre-save mapping calculations manually or let save trigger it
        if (transaction.shouldConvert) {
          transaction.convertedAmount = Number((transaction.amount * transaction.exchangeRate).toFixed(2));
        } else {
          transaction.convertedAmount = transaction.amount;
        }

        await transaction.save({ session });

        // Update Account Balances
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
        if (!transaction) continue; // Skip if transaction doesn't exist

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

        // 1. REVERT OLD TRANSACTION BALANCE EFFECT
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

        // 2. APPLY NEW TRANSACTION BALANCE EFFECT
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

        // 3. UPDATE TRANSACTION FIELDS
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

        // Save
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
