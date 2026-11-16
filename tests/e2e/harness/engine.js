/**
 * TransferSimulationEngine
 * 
 * High-fidelity domain simulation harness for Expense Manager multi-currency transfers.
 * Implements the contract defined in PROJECT.md and TEST_INFRA.md, mirroring:
 * - backend/controllers/transactionController.js
 * - backend/controllers/syncController.js
 * - backend/models/Transaction.js
 * - frontend/src/utils/syncManager.js
 */

export const roundTo2 = (num) => {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
};

export class TransferSimulationEngine {
  constructor(options = {}) {
    this.userId = options.userId || 'user_default';
    this.baseCurrency = options.baseCurrency || 'MYR';
    this.accounts = new Map(); // id -> account object
    this.transactions = new Map(); // id -> transaction object
    this.clientTxIdIndex = new Map(); // clientTxId -> transaction id
    this._idCounter = 1;
  }

  // --- Account Management ---

  createAccount({ id, name, currency, balance = 0, type = 'CASH' }) {
    const accId = id || `acc_${this._idCounter++}`;
    if (this.accounts.has(accId)) {
      throw new Error(`Account already exists: ${accId}`);
    }
    const account = {
      _id: accId,
      name: name || `Account ${accId}`,
      currency: currency.toUpperCase(),
      balance: roundTo2(balance),
      type,
      userId: this.userId
    };
    this.accounts.set(accId, account);
    return { ...account };
  }

  getAccount(id) {
    const acc = this.accounts.get(id);
    if (!acc) return null;
    return { ...acc };
  }

  getAllAccounts() {
    return Array.from(this.accounts.values()).map(acc => ({ ...acc }));
  }

  // --- Transfer Calculation Helper ---

  calculateTransferAmounts(sourceAcc, destAcc, amount, exchangeRate, toAmount) {
    const numAmount = Number(amount);
    const isSameCurrency = sourceAcc.currency === destAcc.currency;

    let computedRate = 1.0;
    let computedToAmount = 0;

    if (isSameCurrency) {
      computedRate = 1.0;
      computedToAmount = roundTo2(numAmount);
    } else {
      if (toAmount !== undefined && toAmount !== null) {
        computedToAmount = roundTo2(toAmount);
        computedRate = exchangeRate !== undefined && exchangeRate !== null 
          ? Number(exchangeRate) 
          : (numAmount > 0 ? computedToAmount / numAmount : 1.0);
      } else if (exchangeRate !== undefined && exchangeRate !== null) {
        computedRate = Number(exchangeRate);
        computedToAmount = roundTo2(numAmount * computedRate);
      } else {
        throw new Error('Cross-currency transfer requires exchangeRate or toAmount');
      }
    }

    return {
      amount: roundTo2(numAmount),
      exchangeRate: computedRate,
      toAmount: computedToAmount
    };
  }

  // --- Transaction Operations ---

  createTransfer(params) {
    const {
      accountId,
      toAccountId,
      amount,
      currency,
      exchangeRate,
      toAmount,
      toCurrency,
      date = new Date().toISOString(),
      note = '',
      description = '',
      clientTxId = null
    } = params;

    // Validation
    if (!accountId || !toAccountId) {
      throw new Error('Missing required transfer account identifiers.');
    }

    if (accountId.toString() === toAccountId.toString()) {
      throw new Error('Source and destination accounts must be different.');
    }

    const sourceAcc = this.accounts.get(accountId.toString());
    if (!sourceAcc) {
      throw new Error(`Source account not found: ${accountId}`);
    }

    const destAcc = this.accounts.get(toAccountId.toString());
    if (!destAcc) {
      throw new Error(`Destination account not found: ${toAccountId}`);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Transfer amount must be a positive number.');
    }

    if (currency && currency.toUpperCase() !== sourceAcc.currency) {
      throw new Error(`Transfer currency (${currency}) must match source account currency (${sourceAcc.currency}).`);
    }

    const isCrossCurrency = sourceAcc.currency !== destAcc.currency;

    if (isCrossCurrency) {
      if ((exchangeRate === undefined || exchangeRate === null) && (toAmount === undefined || toAmount === null)) {
        throw new Error('Exchange rate or target amount is required for cross-currency transfers.');
      }
      if (exchangeRate !== undefined && exchangeRate !== null && Number(exchangeRate) <= 0) {
        throw new Error('Exchange rate must be greater than zero.');
      }
      if (toAmount !== undefined && toAmount !== null && Number(toAmount) <= 0) {
        throw new Error('Target amount must be greater than zero.');
      }
    }

    // Calculations
    const calculated = this.calculateTransferAmounts(sourceAcc, destAcc, numAmount, exchangeRate, toAmount);

    const txId = params.id || `tx_${this._idCounter++}`;
    const transaction = {
      _id: txId,
      userId: this.userId,
      accountId: sourceAcc._id,
      toAccountId: destAcc._id,
      type: 'TRANSFER',
      amount: calculated.amount,
      currency: sourceAcc.currency,
      exchangeRate: calculated.exchangeRate,
      toAmount: calculated.toAmount,
      toCurrency: destAcc.currency,
      shouldConvert: true,
      convertedAmount: calculated.toAmount,
      date,
      note,
      description,
      clientTxId: clientTxId || null
    };

    // Update balances: Source debited by amount, Dest credited by toAmount
    sourceAcc.balance = roundTo2(sourceAcc.balance - calculated.amount);
    destAcc.balance = roundTo2(destAcc.balance + calculated.toAmount);

    this.transactions.set(txId, transaction);
    if (clientTxId) {
      this.clientTxIdIndex.set(clientTxId, txId);
    }

    return { ...transaction };
  }

  createExpense({ accountId, amount, currency, note = '', date = new Date().toISOString() }) {
    const acc = this.accounts.get(accountId);
    if (!acc) throw new Error(`Account not found: ${accountId}`);
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Expense amount must be positive.');
    }
    acc.balance = roundTo2(acc.balance - numAmount);
    const txId = `tx_${this._idCounter++}`;
    const tx = {
      _id: txId,
      userId: this.userId,
      accountId: acc._id,
      type: 'EXPENSE',
      amount: roundTo2(numAmount),
      currency: currency || acc.currency,
      date,
      note
    };
    this.transactions.set(txId, tx);
    return { ...tx };
  }

  createIncome({ accountId, amount, currency, note = '', date = new Date().toISOString() }) {
    const acc = this.accounts.get(accountId);
    if (!acc) throw new Error(`Account not found: ${accountId}`);
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Income amount must be positive.');
    }
    acc.balance = roundTo2(acc.balance + numAmount);
    const txId = `tx_${this._idCounter++}`;
    const tx = {
      _id: txId,
      userId: this.userId,
      accountId: acc._id,
      type: 'INCOME',
      amount: roundTo2(numAmount),
      currency: currency || acc.currency,
      date,
      note
    };
    this.transactions.set(txId, tx);
    return { ...tx };
  }

  deleteTransaction(id) {
    const tx = this.transactions.get(id);
    if (!tx) {
      throw new Error(`Transaction not found: ${id}`);
    }

    if (tx.type === 'TRANSFER') {
      const sourceAcc = this.accounts.get(tx.accountId);
      const destAcc = this.accounts.get(tx.toAccountId);

      // Restore balances
      if (sourceAcc) {
        sourceAcc.balance = roundTo2(sourceAcc.balance + tx.amount);
      }
      if (destAcc) {
        destAcc.balance = roundTo2(destAcc.balance - tx.toAmount);
      }
    } else if (tx.type === 'INCOME') {
      const acc = this.accounts.get(tx.accountId);
      if (acc) acc.balance = roundTo2(acc.balance - tx.amount);
    } else if (tx.type === 'EXPENSE') {
      const acc = this.accounts.get(tx.accountId);
      if (acc) acc.balance = roundTo2(acc.balance + tx.amount);
    }

    this.transactions.delete(id);
    if (tx.clientTxId) {
      this.clientTxIdIndex.delete(tx.clientTxId);
    }

    return true;
  }

  updateTransfer(id, updates) {
    const oldTx = this.transactions.get(id);
    if (!oldTx || oldTx.type !== 'TRANSFER') {
      throw new Error(`Transfer transaction not found: ${id}`);
    }

    // 1. Revert old balance effects
    const oldSourceAcc = this.accounts.get(oldTx.accountId);
    const oldDestAcc = this.accounts.get(oldTx.toAccountId);
    if (oldSourceAcc) {
      oldSourceAcc.balance = roundTo2(oldSourceAcc.balance + oldTx.amount);
    }
    if (oldDestAcc) {
      oldDestAcc.balance = roundTo2(oldDestAcc.balance - oldTx.toAmount);
    }

    // 2. Validate new parameters
    const newSourceId = updates.accountId || oldTx.accountId;
    const newDestId = updates.toAccountId || oldTx.toAccountId;

    if (newSourceId.toString() === newDestId.toString()) {
      // Rollback revert before throwing
      if (oldSourceAcc) oldSourceAcc.balance = roundTo2(oldSourceAcc.balance - oldTx.amount);
      if (oldDestAcc) oldDestAcc.balance = roundTo2(oldDestAcc.balance + oldTx.toAmount);
      throw new Error('Source and destination accounts must be different.');
    }

    const newSourceAcc = this.accounts.get(newSourceId);
    const newDestAcc = this.accounts.get(newDestId);
    if (!newSourceAcc || !newDestAcc) {
      // Rollback revert before throwing
      if (oldSourceAcc) oldSourceAcc.balance = roundTo2(oldSourceAcc.balance - oldTx.amount);
      if (oldDestAcc) oldDestAcc.balance = roundTo2(oldDestAcc.balance + oldTx.toAmount);
      throw new Error('Account not found for update.');
    }

    const newAmount = updates.amount !== undefined ? Number(updates.amount) : oldTx.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      if (oldSourceAcc) oldSourceAcc.balance = roundTo2(oldSourceAcc.balance - oldTx.amount);
      if (oldDestAcc) oldDestAcc.balance = roundTo2(oldDestAcc.balance + oldTx.toAmount);
      throw new Error('Transfer amount must be a positive number.');
    }

    const newRate = updates.exchangeRate !== undefined ? updates.exchangeRate : oldTx.exchangeRate;
    const newToAmount = updates.toAmount !== undefined ? updates.toAmount : (
      updates.amount !== undefined || updates.exchangeRate !== undefined ? undefined : oldTx.toAmount
    );

    const calculated = this.calculateTransferAmounts(newSourceAcc, newDestAcc, newAmount, newRate, newToAmount);

    // 3. Apply new balance effects
    newSourceAcc.balance = roundTo2(newSourceAcc.balance - calculated.amount);
    newDestAcc.balance = roundTo2(newDestAcc.balance + calculated.toAmount);

    // 4. Update transaction record
    oldTx.accountId = newSourceAcc._id;
    oldTx.toAccountId = newDestAcc._id;
    oldTx.amount = calculated.amount;
    oldTx.currency = newSourceAcc.currency;
    oldTx.exchangeRate = calculated.exchangeRate;
    oldTx.toAmount = calculated.toAmount;
    oldTx.toCurrency = newDestAcc.currency;
    oldTx.convertedAmount = calculated.toAmount;
    if (updates.note !== undefined) oldTx.note = updates.note;
    if (updates.description !== undefined) oldTx.description = updates.description;
    if (updates.date !== undefined) oldTx.date = updates.date;

    return { ...oldTx };
  }

  // --- Offline Batch Sync Engine ---

  syncBatch(ops) {
    if (!Array.isArray(ops)) {
      throw new Error('Invalid sync operations format.');
    }

    const processedOps = [];
    const idMap = {};

    for (const op of ops) {
      const { type, clientTxId, id, data } = op;

      if (type === 'CREATE') {
        if (!clientTxId) continue;
        if (this.clientTxIdIndex.has(clientTxId)) {
          const existingId = this.clientTxIdIndex.get(clientTxId);
          idMap[clientTxId] = existingId;
          processedOps.push({ clientTxId, status: 'SKIPPED_DUPLICATE', id: existingId });
          continue;
        }

        const tx = this.createTransfer({
          ...data,
          clientTxId
        });
        idMap[clientTxId] = tx._id;
        processedOps.push({ clientTxId, status: 'CREATED', id: tx._id });
      } else if (type === 'UPDATE') {
        const targetId = id || (clientTxId ? this.clientTxIdIndex.get(clientTxId) : null);
        if (!targetId || !this.transactions.has(targetId)) {
          processedOps.push({ clientTxId, status: 'NOT_FOUND' });
          continue;
        }
        const updated = this.updateTransfer(targetId, data);
        processedOps.push({ clientTxId, status: 'UPDATED', id: updated._id });
      } else if (type === 'DELETE') {
        const targetId = id || (clientTxId ? this.clientTxIdIndex.get(clientTxId) : null);
        if (!targetId || !this.transactions.has(targetId)) {
          processedOps.push({ clientTxId, status: 'NOT_FOUND' });
          continue;
        }
        this.deleteTransaction(targetId);
        processedOps.push({ clientTxId, status: 'DELETED', id: targetId });
      }
    }

    return {
      success: true,
      processedOps,
      idMap
    };
  }

  // --- Account Transaction History & Ledger ---

  getAccountLedger(accountId) {
    const acc = this.accounts.get(accountId);
    if (!acc) throw new Error(`Account not found: ${accountId}`);

    const entries = [];
    for (const tx of this.transactions.values()) {
      if (tx.type === 'TRANSFER') {
        if (tx.accountId === accountId) {
          entries.push({
            txId: tx._id,
            date: tx.date,
            flow: 'OUTFLOW',
            displayAmount: tx.amount,
            displayCurrency: tx.currency,
            note: tx.note,
            counterpartyAccountId: tx.toAccountId
          });
        }
        if (tx.toAccountId === accountId) {
          entries.push({
            txId: tx._id,
            date: tx.date,
            flow: 'INFLOW',
            displayAmount: tx.toAmount,
            displayCurrency: tx.toCurrency,
            note: tx.note,
            counterpartyAccountId: tx.accountId
          });
        }
      } else if (tx.accountId === accountId) {
        entries.push({
          txId: tx._id,
          date: tx.date,
          flow: tx.type === 'INCOME' ? 'INFLOW' : 'OUTFLOW',
          displayAmount: tx.amount,
          displayCurrency: tx.currency,
          note: tx.note
        });
      }
    }

    return {
      account: { ...acc },
      ledger: entries.sort((a, b) => {
        const timeDiff = new Date(b.date) - new Date(a.date);
        if (timeDiff !== 0) return timeDiff;
        return String(b.txId).localeCompare(String(a.txId), undefined, { numeric: true });
      })
    };
  }
}
