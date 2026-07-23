const mongoose = require('mongoose');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table');
const AdmZip = require('adm-zip');

const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const User = require('../models/User');

// Helper: Encrypt data using AES-256-GCM with scrypt key derivation
const encryptJSON = (dataObj, passcode) => {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(passcode, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const jsonStr = JSON.stringify(dataObj);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encrypted: true,
    version: '1.0',
    kdf: 'scrypt',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted
  };
};

// Helper: Decrypt data using AES-256-GCM
const decryptJSON = (payload, passcode) => {
  if (!payload || !payload.encrypted) return payload;
  try {
    const salt = Buffer.from(payload.salt, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const key = crypto.scryptSync(passcode, salt, 32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(payload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    throw new Error('INVALID_PASSCODE');
  }
};

// Helper: Extract data from .mmbak archive or raw file
const parseMMBAKFile = (fileBuffer) => {
  try {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();
    let jsonEntry = zipEntries.find(e => e.entryName.endsWith('.json'));
    let csvEntry = zipEntries.find(e => e.entryName.endsWith('.csv'));

    if (jsonEntry) {
      const content = jsonEntry.getData().toString('utf8');
      return JSON.parse(content);
    }
    if (csvEntry) {
      const csvStr = csvEntry.getData().toString('utf8');
      return { csvData: csvStr };
    }
  } catch (e) {
    // If not a zip, attempt parsing raw text as JSON or CSV
    const rawStr = fileBuffer.toString('utf8');
    try {
      return JSON.parse(rawStr);
    } catch (_) {
      return { csvData: rawStr };
    }
  }
  return null;
};

// --- EXPORT CONTROLLER ---
exports.exportData = async (req, res, next) => {
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
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    // Fetch data
    const accounts = await Account.find({ userId }).lean();
    const categories = await Category.find({ userId }).lean();
    const transactions = await Transaction.find(dateFilter).sort({ date: -1 }).lean();

    // Account & Category map for fast lookup
    const accountMap = accounts.reduce((acc, a) => ({ ...acc, [a._id.toString()]: a.name }), {});
    const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c._id.toString()]: `${c.emoji || ''} ${c.name}`.trim() }), {});

    // --- JSON EXPORT ---
    if (format === 'json') {
      let exportPayload = {
        version: '1.0',
        app: 'ExpenseManager',
        exportedAt: new Date().toISOString(),
        userSettings: {
          baseCurrency: user.baseCurrency,
          preferredCurrencies: user.preferredCurrencies,
          settings: user.settings
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
          accountRef: t.accountId.toString(),
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
      res.setHeader('Content-Disposition', `attachment; filename=ExpenseManager_Backup_${new Date().toISOString().slice(0,10)}.json`);
      return res.status(200).send(JSON.stringify(exportPayload, null, 2));
    }

    // --- CSV EXPORT ---
    if (format === 'csv') {
      const headers = ['Date', 'Type', 'Amount', 'Currency', 'Account', 'Destination Account', 'Category', 'Description', 'Note', 'ClientTxId'];
      const rows = transactions.map(t => [
        new Date(t.date).toISOString().slice(0, 10),
        t.type,
        t.amount,
        t.currency,
        `"${(accountMap[t.accountId.toString()] || 'Unknown').replace(/"/g, '""')}"`,
        t.toAccountId ? `"${(accountMap[t.toAccountId.toString()] || '').replace(/"/g, '""')}"` : '',
        t.categoryId ? `"${(categoryMap[t.categoryId.toString()] || '').replace(/"/g, '""')}"` : '',
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
        t.clientTxId || ''
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=ExpenseManager_Export_${new Date().toISOString().slice(0,10)}.csv`);
      return res.status(200).send(csvContent);
    }

    // --- XLSX EXPORT ---
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ExpenseManager';
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 25 },
        { header: 'Value', key: 'value', width: 25 }
      ];
      
      const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.convertedAmount || t.amount), 0);
      const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.convertedAmount || t.amount), 0);

      summarySheet.addRows([
        { metric: 'Export Date', value: new Date().toLocaleDateString() },
        { metric: 'Base Currency', value: user.baseCurrency },
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
      accSheet.addRows(accounts);
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
          date: new Date(t.date).toISOString().slice(0, 10),
          type: t.type,
          amount: t.amount,
          currency: t.currency,
          account: accountMap[t.accountId.toString()] || 'Unknown',
          category: t.categoryId ? categoryMap[t.categoryId.toString()] : 'N/A',
          description: t.description || t.note || ''
        });
      });
      txSheet.getRow(1).font = { bold: true };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=ExpenseManager_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    // --- PDF REPORT EXPORT ---
    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Financial_Report_${new Date().toISOString().slice(0,10)}.pdf`);
      doc.pipe(res);

      // Title & Header
      doc.fontSize(22).fillColor('#4F46E5').text('ExpenseManager - Financial Summary', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#6B7280').text(`Period: ${startDate || 'Beginning'} to ${endDate || 'Present'} | Currency: ${user.baseCurrency}`, { align: 'center' });
      doc.moveDown(1.5);

      // Income/Expense/Savings Metrics
      const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.convertedAmount || t.amount), 0);
      const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.convertedAmount || t.amount), 0);
      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';

      doc.rect(30, 100, 535, 65).fill('#F3F4F6');
      doc.fillColor('#1F2937').fontSize(12).text(`Total Income: ${user.baseCurrency} ${totalIncome.toFixed(2)}`, 45, 115);
      doc.fillColor('#EF4444').fontSize(12).text(`Total Expenses: ${user.baseCurrency} ${totalExpense.toFixed(2)}`, 220, 115);
      doc.fillColor('#10B981').fontSize(12).text(`Net Savings: ${user.baseCurrency} ${netSavings.toFixed(2)} (${savingsRate}%)`, 380, 115);
      doc.moveDown(3);

      // Top Expense Categories
      const catTotals = {};
      transactions.filter(t => t.type === 'EXPENSE' && t.categoryId).forEach(t => {
        const catName = categoryMap[t.categoryId.toString()] || 'Other';
        catTotals[catName] = (catTotals[catName] || 0) + (t.convertedAmount || t.amount);
      });

      const topCategories = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
      doc.fillColor('#1F2937').fontSize(14).text('Top Expense Breakdown', 30, 185);
      let yPos = 205;
      topCategories.forEach(([catName, amount]) => {
        const pct = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0';
        doc.fontSize(10).fillColor('#374151').text(`${catName}: ${user.baseCurrency} ${amount.toFixed(2)} (${pct}%)`, 40, yPos);
        yPos += 16;
      });

      // Transaction Table Summary
      doc.moveDown(2);
      doc.fillColor('#1F2937').fontSize(14).text('Recent Transactions', 30, yPos + 10);
      
      const pdfTable = new PDFTable(doc, { autoPage: true });
      const tableData = {
        headers: ['Date', 'Type', 'Account', 'Category', 'Amount'],
        rows: transactions.slice(0, 30).map(t => [
          new Date(t.date).toISOString().slice(0, 10),
          t.type,
          accountMap[t.accountId.toString()] || 'N/A',
          t.categoryId ? categoryMap[t.categoryId.toString()] : 'Transfer/N/A',
          `${t.currency} ${t.amount.toFixed(2)}`
        ])
      };
      
      pdfTable.addTable(tableData, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9),
        prepareRow: (row, i) => doc.font('Helvetica').fontSize(8)
      });

      doc.end();
      return;
    }

    res.status(400).json({ success: false, message: 'Unsupported format request.' });
  } catch (err) {
    next(err);
  }
};

// --- IMPORT DRY-RUN SCAN CONTROLLER ---
exports.scanImportData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { passcode } = req.body;
    let payload = req.body.payload;

    if (!req.file && !payload) {
      return res.status(400).json({ success: false, message: 'Please upload a backup file or provide payload.' });
    }

    if (req.file) {
      const mmbakObj = parseMMBAKFile(req.file.buffer);
      if (!mmbakObj) {
        return res.status(400).json({ success: false, message: 'Unable to parse backup file format.' });
      }
      payload = mmbakObj;
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
exports.commitImportData = async (req, res, next) => {
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

    const accountIdMap = {};
    const categoryIdMap = {};

    // 1. Process Accounts
    const incomingAccounts = payload.accounts || [];
    for (const acc of incomingAccounts) {
      let existingAcc = await Account.findOne({ userId, name: acc.name }).session(session);
      if (!existingAcc) {
        existingAcc = new Account({
          userId,
          name: acc.name,
          type: acc.type || 'SAVINGS',
          balance: acc.balance || 0,
          currency: acc.currency || 'MYR'
        });
        await existingAcc.save({ session });
      }
      if (acc.oldId) accountIdMap[acc.oldId] = existingAcc._id;
    }

    // Fallback default account if none exists
    let defaultAcc = await Account.findOne({ userId }).session(session);
    if (!defaultAcc) {
      defaultAcc = await Account.create([{ userId, name: 'Main Account', type: 'SAVINGS', balance: 0, currency: 'MYR' }], { session });
      defaultAcc = defaultAcc[0];
    }

    // 2. Process Categories (Root first, then Subcategories)
    const incomingCategories = payload.categories || [];
    const rootCats = incomingCategories.filter(c => !c.parentId);
    const subCats = incomingCategories.filter(c => c.parentId);

    for (const cat of rootCats) {
      let existingCat = await Category.findOne({ userId, name: cat.name, type: cat.type }).session(session);
      if (!existingCat) {
        existingCat = new Category({
          userId,
          name: cat.name,
          emoji: cat.emoji || '',
          color: cat.color || '#94a3b8',
          type: cat.type || 'EXPENSE'
        });
        await existingCat.save({ session });
      }
      if (cat.oldId) categoryIdMap[cat.oldId] = existingCat._id;
    }

    for (const cat of subCats) {
      const mappedParentId = categoryIdMap[cat.parentId] || null;
      let existingCat = await Category.findOne({ userId, name: cat.name, type: cat.type }).session(session);
      if (!existingCat) {
        existingCat = new Category({
          userId,
          name: cat.name,
          emoji: cat.emoji || '',
          color: cat.color || '#94a3b8',
          type: cat.type || 'EXPENSE',
          parentId: mappedParentId
        });
        await existingCat.save({ session });
      }
      if (cat.oldId) categoryIdMap[cat.oldId] = existingCat._id;
    }

    // Fallback category
    let defaultCat = await Category.findOne({ userId, type: 'EXPENSE' }).session(session);
    if (!defaultCat) {
      defaultCat = await Category.create([{ userId, name: 'General', emoji: '📦', type: 'EXPENSE' }], { session });
      defaultCat = defaultCat[0];
    }

    // 3. Process Transactions
    const incomingTransactions = payload.transactions || [];
    let importedCount = 0;
    let skippedCount = 0;
    let replacedCount = 0;

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
        const existing = await Transaction.findOne({ userId, clientTxId: tx.clientTxId }).session(session);
        if (existing) {
          existing.amount = tx.amount;
          existing.currency = tx.currency || 'MYR';
          existing.type = tx.type;
          existing.date = tx.date;
          existing.description = tx.description || tx.note;
          await existing.save({ session });
          replacedCount++;
          continue;
        }
      }

      // New or DUPLICATE insert
      const newTx = new Transaction({
        userId,
        accountId: mappedAccId,
        toAccountId: tx.type === 'TRANSFER' ? mappedToAccId : undefined,
        categoryId: tx.type !== 'TRANSFER' ? mappedCatId : undefined,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency || 'MYR',
        exchangeRate: tx.exchangeRate || 1.0,
        convertedAmount: tx.convertedAmount || tx.amount,
        date: tx.date || new Date(),
        description: tx.description || tx.note,
        clientTxId: userChoice === 'DUPLICATE' ? `${tx.clientTxId}_dup_${Date.now()}` : (tx.clientTxId || `import_${Date.now()}_${Math.random().toString(36).substring(7)}`)
      });

      await newTx.save({ session });
      importedCount++;
    }

    // 4. Recalculate Account Balances
    const userAccounts = await Account.find({ userId }).session(session);
    for (const acc of userAccounts) {
      const userTxs = await Transaction.find({ userId, $or: [{ accountId: acc._id }, { toAccountId: acc._id }] }).session(session);
      let balance = 0;
      userTxs.forEach(t => {
        const amt = t.amount;
        if (t.accountId.toString() === acc._id.toString()) {
          if (t.type === 'INCOME') balance += amt;
          else if (t.type === 'EXPENSE' || t.type === 'TRANSFER') balance -= amt;
        }
        if (t.toAccountId && t.toAccountId.toString() === acc._id.toString() && t.type === 'TRANSFER') {
          balance += amt;
        }
      });
      acc.balance = balance;
      await acc.save({ session });
    }

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
