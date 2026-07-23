import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';

import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

import {
  encryptJSON,
  decryptJSON,
  parseBackupFile,
  stripEmojis
} from '../services/exportImportService.js';

// --- EXPORT CONTROLLER ---
export const exportData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { format = 'json', startDate, endDate, passcode } = req.query;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Build Date Filter
    const dateFilter = { userId };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length === 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        dateFilter.date.$lte = end;
      }
    }

    // Fetch data
    const accounts = await Account.find({ userId }).lean();
    const categories = await Category.find({ userId }).lean();
    const transactions = await Transaction.find(dateFilter).sort({ date: -1 }).lean();

    // Account & Category map for fast lookup (Clean names without emojis for exports)
    const accountMap = accounts.reduce((acc, a) => ({ ...acc, [a._id ? a._id.toString() : '']: stripEmojis(a.name) || a.name || 'Account' }), {});
    const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c._id ? c._id.toString() : '']: stripEmojis(c.name) || c.name || 'Category' }), {});

    // --- JSON EXPORT ---
    if (format === 'json') {
      let exportPayload = {
        version: '1.0',
        app: 'NexusWealth',
        exportedAt: new Date().toISOString(),
        userSettings: {
          baseCurrency: user.baseCurrency || 'USD',
          preferredCurrencies: user.preferredCurrencies || [],
          settings: user.settings || {}
        },
        accounts: accounts.map(a => ({
          oldId: a._id.toString(),
          name: a.name,
          type: a.type,
          balance: a.balance,
          currency: a.currency
        })),
        categories: categories.map(c => ({
          oldId: c._id.toString(),
          name: c.name,
          emoji: c.emoji,
          color: c.color,
          parentId: c.parentId ? c.parentId.toString() : null,
          type: c.type
        })),
        transactions: transactions.map(t => ({
          clientTxId: t.clientTxId || `tx_${t._id}`,
          accountRef: t.accountId ? t.accountId.toString() : '',
          toAccountRef: t.toAccountId ? t.toAccountId.toString() : null,
          categoryRef: t.categoryId ? t.categoryId.toString() : null,
          type: t.type,
          amount: t.amount,
          currency: t.currency,
          convertedAmount: t.convertedAmount,
          exchangeRate: t.exchangeRate,
          date: t.date,
          description: t.description || '',
          note: t.note || ''
        }))
      };

      if (passcode && passcode.trim().length > 0) {
        exportPayload = encryptJSON(exportPayload, passcode.trim());
      }

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(JSON.stringify(exportPayload, null, 2));
    }

    // --- CSV EXPORT ---
    if (format === 'csv') {
      const headers = ['Date', 'Type', 'Amount', 'Currency', 'Account', 'Destination Account', 'Category', 'Description', 'Note', 'ClientTxId'];
      const rows = transactions.map(t => [
        t.date && !isNaN(new Date(t.date)) ? new Date(t.date).toISOString().slice(0, 10) : '',
        t.type || '',
        t.amount || 0,
        t.currency || user.baseCurrency || 'USD',
        `"${(t.accountId && accountMap[t.accountId.toString()] ? accountMap[t.accountId.toString()] : 'Unknown').replace(/"/g, '""')}"`,
        t.toAccountId ? `"${(accountMap[t.toAccountId.toString()] || '').replace(/"/g, '""')}"` : '',
        t.categoryId ? `"${(categoryMap[t.categoryId.toString()] || '').replace(/"/g, '""')}"` : '',
        `"${stripEmojis(t.description || '').replace(/"/g, '""')}"`,
        `"${stripEmojis(t.note || '').replace(/"/g, '""')}"`,
        t.clientTxId || ''
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.status(200).send(csvContent);
    }

    // --- XLSX EXPORT ---
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'NexusWealth';
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 25 },
        { header: 'Value', key: 'value', width: 25 }
      ];
      
      const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.convertedAmount || t.amount || 0), 0);
      const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.convertedAmount || t.amount || 0), 0);

      summarySheet.addRows([
        { metric: 'Export Date', value: new Date().toLocaleDateString() },
        { metric: 'Base Currency', value: user.baseCurrency || 'USD' },
        { metric: 'Total Income', value: totalIncome },
        { metric: 'Total Expense', value: totalExpense },
        { metric: 'Net Balance', value: totalIncome - totalExpense },
        { metric: 'Total Accounts', value: accounts.length },
        { metric: 'Total Transactions', value: transactions.length }
      ]);

      // Style summary headers
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

      // Sheet 2: Accounts
      const accSheet = workbook.addWorksheet('Accounts');
      accSheet.columns = [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Balance', key: 'balance', width: 18 },
        { header: 'Currency', key: 'currency', width: 12 }
      ];
      accSheet.addRows(accounts.map(a => ({
        ...a,
        name: stripEmojis(a.name) || a.name
      })));
      accSheet.getRow(1).font = { bold: true };

      // Sheet 3: Transactions
      const txSheet = workbook.addWorksheet('Transactions');
      txSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Currency', key: 'currency', width: 12 },
        { header: 'Account', key: 'account', width: 20 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Description', key: 'description', width: 30 }
      ];

      transactions.forEach(t => {
        txSheet.addRow({
          date: t.date && !isNaN(new Date(t.date)) ? new Date(t.date).toISOString().slice(0, 10) : '',
          type: t.type || '',
          amount: t.amount || 0,
          currency: t.currency || user.baseCurrency || 'USD',
          account: t.accountId ? (accountMap[t.accountId.toString()] || 'Unknown') : 'Unknown',
          category: t.categoryId ? (categoryMap[t.categoryId.toString()] || 'N/A') : 'N/A',
          description: stripEmojis(t.description || t.note || '')
        });
      });
      txSheet.getRow(1).font = { bold: true };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await workbook.xlsx.write(res);
      return res.end();
    }

    // --- PDF REPORT EXPORT ---
    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));

      const baseCurr = user.baseCurrency || 'USD';

      // Title & Header
      doc.fontSize(22).fillColor('#4F46E5').text('NexusWealth - Financial Summary', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#6B7280').text(`Period: ${startDate || 'Beginning'} to ${endDate || 'Present'} | Currency: ${baseCurr}`, { align: 'center' });
      doc.moveDown(1.5);

      // Income/Expense/Savings Metrics
      const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.convertedAmount || t.amount || 0), 0);
      const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.convertedAmount || t.amount || 0), 0);
      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';

      const boxY = doc.y;
      doc.rect(30, boxY, 535, 55).fill('#F3F4F6');

      // Metric 1: Total Income
      doc.fillColor('#4B5563').fontSize(9).font('Helvetica-Bold').text('TOTAL INCOME', 45, boxY + 12);
      doc.fillColor('#10B981').fontSize(11).font('Helvetica-Bold').text(`${baseCurr} ${totalIncome.toFixed(2)}`, 45, boxY + 28);

      // Metric 2: Total Expenses
      doc.fillColor('#4B5563').fontSize(9).font('Helvetica-Bold').text('TOTAL EXPENSES', 220, boxY + 12);
      doc.fillColor('#EF4444').fontSize(11).font('Helvetica-Bold').text(`${baseCurr} ${totalExpense.toFixed(2)}`, 220, boxY + 28);

      // Metric 3: Net Savings
      doc.fillColor('#4B5563').fontSize(9).font('Helvetica-Bold').text('NET SAVINGS', 390, boxY + 12);
      doc.fillColor('#4F46E5').fontSize(11).font('Helvetica-Bold').text(`${baseCurr} ${netSavings.toFixed(2)} (${savingsRate}%)`, 390, boxY + 28);
      
      doc.font('Helvetica');
      doc.y = boxY + 70;

      // Top Expense Categories
      const catTotals = {};
      transactions.filter(t => t.type === 'EXPENSE' && t.categoryId).forEach(t => {
        const catName = categoryMap[t.categoryId.toString()] || 'Other';
        catTotals[catName] = (catTotals[catName] || 0) + (t.convertedAmount || t.amount || 0);
      });

      const topCategories = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const catHeaderY = doc.y;
      doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold').text('Top Expense Breakdown', 30, catHeaderY);
      let yPos = catHeaderY + 20;

      if (topCategories.length === 0) {
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('No expense records in selected period.', 40, yPos);
        yPos += 20;
      } else {
        topCategories.forEach(([catName, amount]) => {
          const pct = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0';
          doc.fontSize(10).font('Helvetica').fillColor('#374151').text(`${catName}: ${baseCurr} ${amount.toFixed(2)} (${pct}%)`, 40, yPos);
          yPos += 16;
        });
      }

      doc.y = yPos + 15;
      const txHeaderY = doc.y;
      doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold').text('Recent Transactions', 30, txHeaderY);
      doc.y = txHeaderY + 20;

      const tableRows = transactions.slice(0, 30).map(t => [
        t.date && !isNaN(new Date(t.date)) ? new Date(t.date).toISOString().slice(0, 10) : 'N/A',
        t.type || 'N/A',
        t.accountId ? (accountMap[t.accountId.toString()] || 'N/A') : 'N/A',
        t.categoryId ? (categoryMap[t.categoryId.toString()] || 'Transfer/N/A') : 'Transfer/N/A',
        stripEmojis(t.description || t.note || '-'),
        `${t.currency || baseCurr} ${(Number(t.amount) || 0).toFixed(2)}`
      ]);

      const tableData = {
        headers: [
          { label: 'Date', width: 65 },
          { label: 'Type', width: 55 },
          { label: 'Account', width: 75 },
          { label: 'Category', width: 85 },
          { label: 'Note / Description', width: 170 },
          { label: 'Amount', width: 80 }
        ],
        rows: tableRows
      };
      
      await doc.table(tableData, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9),
        prepareRow: (row, i) => doc.font('Helvetica').fontSize(8)
      });

      doc.end();

      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
      });

      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.status(200).send(pdfBuffer);
    }

    res.status(400).json({ success: false, message: 'Unsupported format request.' });
  } catch (err) {
    next(err);
  }
};

// --- IMPORT DRY-RUN SCAN CONTROLLER ---
export const scanImportData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { passcode } = req.body;
    let payload = req.body.payload;

    if (!req.file && !payload) {
      return res.status(400).json({ success: false, message: 'Please upload a backup file or provide payload.' });
    }

    if (req.file) {
      const backupPayload = await parseBackupFile(req.file.buffer, req.file.originalname || '');
      if (!backupPayload) {
        return res.status(400).json({ success: false, message: 'Unable to parse backup file format.' });
      }
      payload = backupPayload;
    }

    // Decrypt if encrypted
    if (payload.encrypted) {
      if (!passcode) {
        return res.status(200).json({ success: true, isEncrypted: true, message: 'Passcode required for decryption.' });
      }
      try {
        payload = decryptJSON(payload, passcode);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid encryption passcode.' });
      }
    }

    // Fetch existing user data for comparison
    const existingAccounts = await Account.find({ userId }).lean();
    const existingCategories = await Category.find({ userId }).lean();
    const existingTransactions = await Transaction.find({ userId }).lean();

    const existingTxMap = existingTransactions.reduce((acc, t) => {
      if (t.clientTxId) acc[t.clientTxId] = t;
      const key = `${new Date(t.date).toISOString().slice(0,10)}_${t.amount}_${t.type}`;
      acc[key] = t;
      return acc;
    }, {});

    const incomingTransactions = payload.transactions || [];
    const conflicts = [];
    const cleanItems = [];

    incomingTransactions.forEach(item => {
      const dateKey = item.date ? new Date(item.date).toISOString().slice(0,10) : '';
      const key = item.clientTxId || `${dateKey}_${item.amount}_${item.type}`;
      const match = existingTxMap[key];

      if (match) {
        conflicts.push({
          incoming: item,
          existing: {
            id: match._id,
            clientTxId: match.clientTxId,
            amount: match.amount,
            currency: match.currency,
            type: match.type,
            date: match.date,
            description: match.description || match.note
          }
        });
      } else {
        cleanItems.push(item);
      }
    });

    res.status(200).json({
      success: true,
      isEncrypted: false,
      summary: {
        totalIncomingAccounts: (payload.accounts || []).length,
        totalIncomingCategories: (payload.categories || []).length,
        totalIncomingTransactions: incomingTransactions.length,
        cleanTransactionsCount: cleanItems.length,
        conflictsCount: conflicts.length
      },
      conflicts,
      cleanItemsCount: cleanItems.length,
      payload
    });
  } catch (err) {
    next(err);
  }
};

// --- IMPORT ATOMIC COMMIT CONTROLLER ---
export const commitImportData = async (req, res, next) => {
  const userId = req.user.id;
  const { payload, decisions = {}, strategy = 'MERGE' } = req.body;

  if (!payload) {
    return res.status(400).json({ success: false, message: 'Import payload missing.' });
  }

  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (e) {
    session = null;
  }

  try {
    if (session) session.startTransaction();

    // OVERWRITE strategy option
    if (strategy === 'OVERWRITE') {
      await Transaction.deleteMany({ userId }).session(session);
      await Account.deleteMany({ userId }).session(session);
      await Category.deleteMany({ userId }).session(session);
    }

    // Pre-fetch all user's existing accounts & categories in 2 single queries
    const existingAccounts = await Account.find({ userId }).session(session);
    const accountMapByName = new Map(existingAccounts.map(a => [(a.name || '').toLowerCase(), a]));
    const accountIdMap = {};

    // 1. Process Accounts in Bulk
    const incomingAccounts = payload.accounts || [];
    const newAccountsToCreate = [];

    for (const acc of incomingAccounts) {
      const accKey = (acc.name || '').toLowerCase();
      let accObj = accountMapByName.get(accKey);

      if (!accObj) {
        const newAcc = new Account({
          userId,
          name: acc.name,
          type: acc.type || 'SAVINGS',
          balance: acc.balance || 0,
          currency: acc.currency || 'MYR'
        });
        newAccountsToCreate.push(newAcc);
        accountMapByName.set(accKey, newAcc);
      } else {
        if (acc.oldId) accountIdMap[acc.oldId] = accObj._id;
      }
    }

    if (newAccountsToCreate.length > 0) {
      const insertedAccs = await Account.insertMany(newAccountsToCreate, { session });
      insertedAccs.forEach((insAcc) => {
        const insName = (insAcc?.name || '').toLowerCase();
        const origAcc = incomingAccounts.find(a => (a.name || '').toLowerCase() === insName);
        if (origAcc && origAcc.oldId) {
          accountIdMap[origAcc.oldId] = insAcc._id;
        }
      });
    }

    // Default account fallback
    let defaultAcc = accountMapByName.values().next().value;
    if (!defaultAcc) {
      const createdAccs = await Account.create([{ userId, name: 'Main Account', type: 'SAVINGS', balance: 0, currency: 'MYR' }], { session });
      defaultAcc = createdAccs[0];
      accountMapByName.set('main account', defaultAcc);
    }

    // 2. Process Categories in Bulk
    const existingCategories = await Category.find({ userId }).session(session);
    const categoryMapByKey = new Map(existingCategories.map(c => [`${(c.name || '').toLowerCase()}_${c.type}`, c]));
    const categoryIdMap = {};

    const incomingCategories = payload.categories || [];
    const rootCats = incomingCategories.filter(c => !c.parentId);
    const subCats = incomingCategories.filter(c => c.parentId);

    const newRootCatsToCreate = [];
    for (const cat of rootCats) {
      const key = `${(cat.name || '').toLowerCase()}_${cat.type || 'EXPENSE'}`;
      let catObj = categoryMapByKey.get(key);

      if (!catObj) {
        const newCat = new Category({
          userId,
          name: cat.name,
          emoji: cat.emoji || '',
          color: cat.color || '#94a3b8',
          type: cat.type || 'EXPENSE'
        });
        newRootCatsToCreate.push(newCat);
        categoryMapByKey.set(key, newCat);
      } else {
        if (cat.oldId) categoryIdMap[cat.oldId] = catObj._id;
      }
    }

    if (newRootCatsToCreate.length > 0) {
      const insertedRoots = await Category.insertMany(newRootCatsToCreate, { session });
      insertedRoots.forEach((insCat) => {
        const insName = (insCat?.name || '').toLowerCase();
        const origCat = rootCats.find(c => (c.name || '').toLowerCase() === insName && (c.type || 'EXPENSE') === insCat.type);
        if (origCat && origCat.oldId) {
          categoryIdMap[origCat.oldId] = insCat._id;
        }
      });
    }

    const newSubCatsToCreate = [];
    for (const cat of subCats) {
      const key = `${(cat.name || '').toLowerCase()}_${cat.type || 'EXPENSE'}`;
      let catObj = categoryMapByKey.get(key);

      if (!catObj) {
        const mappedParentId = categoryIdMap[cat.parentId] || null;
        const newCat = new Category({
          userId,
          name: cat.name,
          emoji: cat.emoji || '',
          color: cat.color || '#94a3b8',
          type: cat.type || 'EXPENSE',
          parentId: mappedParentId
        });
        newSubCatsToCreate.push(newCat);
        categoryMapByKey.set(key, newCat);
      } else {
        if (cat.oldId) categoryIdMap[cat.oldId] = catObj._id;
      }
    }

    if (newSubCatsToCreate.length > 0) {
      const insertedSubs = await Category.insertMany(newSubCatsToCreate, { session });
      insertedSubs.forEach((insCat) => {
        const insName = (insCat?.name || '').toLowerCase();
        const origCat = subCats.find(c => (c.name || '').toLowerCase() === insName && (c.type || 'EXPENSE') === insCat.type);
        if (origCat && origCat.oldId) {
          categoryIdMap[origCat.oldId] = insCat._id;
        }
      });
    }

    // Default category fallback
    let defaultCat = Array.from(categoryMapByKey.values()).find(c => c.type === 'EXPENSE');
    if (!defaultCat) {
      const createdCats = await Category.create([{ userId, name: 'General', emoji: '📦', type: 'EXPENSE' }], { session });
      defaultCat = createdCats[0];
    }

    // 3. Process Transactions in Bulk
    const incomingTransactions = payload.transactions || [];
    let importedCount = 0;
    let skippedCount = 0;
    let replacedCount = 0;

    const bulkInserts = [];
    const bulkUpdates = [];

    // Pre-fetch existing transactions if REPLACE decisions are needed
    const existingTxDocs = await Transaction.find({ userId }).select('_id clientTxId').lean().session(session);
    const existingTxByClientTxId = new Map(existingTxDocs.map(t => [t.clientTxId, t._id]));

    for (const tx of incomingTransactions) {
      const txIdKey = tx.clientTxId || `tx_${tx.date}_${tx.amount}`;
      const userChoice = decisions[txIdKey] || 'IMPORT';

      if (userChoice === 'KEEP') {
        skippedCount++;
        continue;
      }

      const mappedAccId = accountIdMap[tx.accountRef] || defaultAcc._id;
      const mappedToAccId = tx.toAccountRef ? (accountIdMap[tx.toAccountRef] || null) : null;
      const mappedCatId = tx.categoryRef ? (categoryIdMap[tx.categoryRef] || defaultCat._id) : defaultCat._id;

      if (userChoice === 'REPLACE') {
        const existingId = existingTxByClientTxId.get(tx.clientTxId);
        if (existingId) {
          bulkUpdates.push({
            updateOne: {
              filter: { _id: existingId },
              update: {
                $set: {
                  amount: tx.amount,
                  currency: tx.currency || 'MYR',
                  type: tx.type,
                  date: tx.date,
                  description: tx.description || tx.note
                }
              }
            }
          });
          replacedCount++;
          continue;
        }
      }

      // New or DUPLICATE insert
      const convertedAmt = tx.convertedAmount || (tx.shouldConvert === false ? tx.amount : Number((tx.amount * (tx.exchangeRate || 1.0)).toFixed(2)));

      bulkInserts.push({
        userId,
        accountId: mappedAccId,
        toAccountId: tx.type === 'TRANSFER' ? mappedToAccId : undefined,
        categoryId: tx.type !== 'TRANSFER' ? mappedCatId : undefined,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency || 'MYR',
        exchangeRate: tx.exchangeRate || 1.0,
        convertedAmount: convertedAmt,
        date: tx.date || new Date(),
        description: tx.description || tx.note,
        clientTxId: userChoice === 'DUPLICATE' ? `${tx.clientTxId}_dup_${Date.now()}` : (tx.clientTxId || `import_${Date.now()}_${Math.random().toString(36).substring(7)}`)
      });

      importedCount++;
    }

    if (bulkUpdates.length > 0) {
      await Transaction.bulkWrite(bulkUpdates, { session });
    }

    if (bulkInserts.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < bulkInserts.length; i += chunkSize) {
        const chunk = bulkInserts.slice(i, i + chunkSize);
        await Transaction.insertMany(chunk, { session });
      }
    }

    // 4. Efficient Recalculation of Account Balances using Aggregation
    const userAccounts = await Account.find({ userId }).session(session);

    const incomeExpenseAgg = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$accountId',
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ['$type', 'INCOME'] }, '$amount', 0]
            }
          },
          totalExpense: {
            $sum: {
              $cond: [{ $in: ['$type', ['EXPENSE', 'TRANSFER']] }, '$amount', 0]
            }
          }
        }
      }
    ]).session(session);

    const transferInAgg = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'TRANSFER', toAccountId: { $ne: null } } },
      {
        $group: {
          _id: '$toAccountId',
          totalTransferIn: { $sum: '$amount' }
        }
      }
    ]).session(session);

    const balanceMap = {};
    incomeExpenseAgg.forEach(row => {
      if (!row._id) return;
      const accId = row._id.toString();
      balanceMap[accId] = (balanceMap[accId] || 0) + (row.totalIncome - row.totalExpense);
    });
    transferInAgg.forEach(row => {
      if (!row._id) return;
      const accId = row._id.toString();
      balanceMap[accId] = (balanceMap[accId] || 0) + row.totalTransferIn;
    });

    for (const acc of userAccounts) {
      const calculatedBal = balanceMap[acc._id.toString()] || 0;
      acc.balance = calculatedBal;
      await acc.save({ session });
    }

    // 5. Invalidate InsightCache once
    try {
      await mongoose.model('InsightCache').deleteMany({ userId }).session(session);
    } catch (_) {}

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    res.status(200).json({
      success: true,
      message: 'Import completed successfully.',
      results: { importedCount, replacedCount, skippedCount }
    });
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(err);
  }
};
