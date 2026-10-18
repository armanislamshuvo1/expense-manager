import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';
import AdmZip from 'adm-zip';

// Helper: Encrypt data using AES-256-GCM with scrypt key derivation
export const encryptJSON = (dataObj, passcode) => {
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
export const decryptJSON = (payload, passcode) => {
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

// Helper: Extract cell value from ExcelJS cell
export const getCellValue = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val instanceof Date) return val.toISOString();
    if (val.text !== undefined) return String(val.text);
    if (val.result !== undefined) return String(val.result);
    if (val.richText) return val.richText.map(r => r.text).join('');
  }
  return String(val);
};

// Helper: Parse CSV text into 2D cell string array
export const parseCSVText = (text) => {
  if (!text || typeof text !== 'string') return [];
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let insideQuotes = false;
    let currentCell = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    rows.push(row);
  }
  return rows;
};

// Helper: Convert 2D spreadsheet rows into normalized backup payload
export const convertRowsToPayload = (rows, accountsFromSheet = []) => {
  if (!rows || rows.length < 2) {
    return { version: '1.0', app: 'ImportedData', accounts: [], categories: [], transactions: [] };
  }

  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const nonColCount = rows[i].filter(cell => String(cell || '').trim().length > 0).length;
    if (nonColCount >= 2) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return { version: '1.0', app: 'ImportedData', accounts: [], categories: [], transactions: [] };
  }

  const headers = rows[headerIndex].map(h => String(h || '').trim());
  const normHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const findColIndex = (keywords, excludeIndices = []) => {
    // 1. Try exact match first
    for (const kw of keywords) {
      const idx = normHeaders.findIndex((h, i) => !excludeIndices.includes(i) && h === kw);
      if (idx !== -1) return idx;
    }
    // 2. Fall back to includes match
    for (const kw of keywords) {
      const idx = normHeaders.findIndex((h, i) => !excludeIndices.includes(i) && h.includes(kw));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateIdx = findColIndex(['date', 'time', 'timestamp', 'created']);
  const typeIdx = findColIndex(['type', 'flow', 'incexp', 'incomeexpense', 'transtype']);
  const amountIdx = findColIndex(['amount', 'val', 'value', 'total', 'sum']);
  const incomeIdx = findColIndex(['income', 'deposit', 'credit']);
  const expenseIdx = findColIndex(['expense', 'withdrawal', 'debit']);
  const currIdx = findColIndex(['currency', 'curr']);
  const accIdx = findColIndex(['account', 'wallet', 'bank', 'fromaccount', 'srcaccount']);
  const toAccIdx = findColIndex(['toaccount', 'destaccount', 'targetaccount', 'destinationaccount', 'transferto']);
  const catIdx = findColIndex(['category', 'cat']);
  const subCatIdx = findColIndex(['subcategory', 'subcat']);
  const descIdx = findColIndex(['description', 'desc', 'detail']);
  const noteIdx = findColIndex(['note', 'memo', 'remark', 'title']);
  const rateIdx = findColIndex(['exchangerate', 'rate', 'fxrate', 'conversionrate']);

  // Find converted amount column index (e.g., 'MYR', 'Converted Amount', 'Base Amount')
  const usedIndices = [dateIdx, typeIdx, amountIdx, incomeIdx, expenseIdx, currIdx, accIdx, toAccIdx, catIdx, subCatIdx, descIdx, noteIdx, rateIdx].filter(i => i >= 0);

  let convertedAmtIdx = findColIndex([
    'convertedamount', 'convertedamt', 'converted', 'baseamount', 'localamount', 
    'targetamount', 'convertedval', 'basecurr', 'myramount', 'usdamount', 'euramount',
    'sgdamount', 'inramount', 'gbpamount', 'amountinbase', 'basecurrencyamount'
  ], usedIndices);

  if (convertedAmtIdx === -1) {
    const knownCurrencies = ['myr', 'usd', 'eur', 'gbp', 'sgd', 'inr', 'cad', 'aud', 'jpy', 'cny', 'hkd', 'npr', 'pkr', 'bdt', 'php', 'idr', 'thb', 'vnd', 'krw', 'rub', 'zar', 'brl', 'mxn', 'chf', 'nzd', 'aed', 'sar'];
    convertedAmtIdx = normHeaders.findIndex((h, idx) => {
      if (usedIndices.includes(idx)) return false;
      return knownCurrencies.includes(h) || knownCurrencies.some(c => h === `${c}amount` || h === `amount${c}` || h === `amountin${c}`);
    });
  }

  const parseNumericVal = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const str = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  };

  const accountMap = {};
  const categoryMap = {};
  const transactions = [];

  accountsFromSheet.forEach(acc => {
    const accName = acc.name || 'Main Account';
    if (!accountMap[accName]) {
      const oldId = `acc_${Object.keys(accountMap).length + 1}`;
      accountMap[accName] = {
        oldId,
        name: accName,
        type: acc.type || 'SAVINGS',
        balance: Number(acc.balance) || 0,
        currency: acc.currency || 'USD'
      };
    }
  });

  const getAccountRef = (name, defaultCurr = 'USD') => {
    const cleanName = (name || '').trim() || 'Main Account';
    if (!accountMap[cleanName]) {
      const oldId = `acc_${Object.keys(accountMap).length + 1}`;
      accountMap[cleanName] = {
        oldId,
        name: cleanName,
        type: 'SAVINGS',
        balance: 0,
        currency: defaultCurr
      };
    }
    return accountMap[cleanName].oldId;
  };

  const getCategoryRef = (catName, subCatName, txType = 'EXPENSE') => {
    let fullCatName = (catName || '').trim();
    if (subCatName && (subCatName || '').trim()) {
      fullCatName = `${fullCatName} > ${(subCatName || '').trim()}`;
    }
    if (!fullCatName) fullCatName = 'General';

    if (!categoryMap[fullCatName]) {
      const oldId = `cat_${Object.keys(categoryMap).length + 1}`;
      categoryMap[fullCatName] = {
        oldId,
        name: fullCatName,
        emoji: txType === 'INCOME' ? '💰' : (txType === 'TRANSFER' ? '🔄' : '📦'),
        color: '#4F46E5',
        type: txType === 'INCOME' ? 'INCOME' : 'EXPENSE'
      };
    }
    return categoryMap[fullCatName].oldId;
  };

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(cell => String(cell || '').trim() === '')) continue;

    const rawDate = dateIdx >= 0 ? row[dateIdx] : null;
    let parsedDate = new Date();
    if (rawDate) {
      if (typeof rawDate === 'number' || (!isNaN(rawDate) && !String(rawDate).includes('-') && !String(rawDate).includes('/') && !String(rawDate).includes(':'))) {
        const num = Number(rawDate);
        if (num > 20000 && num < 70000) {
          parsedDate = new Date(Math.round((num - 25569) * 86400 * 1000));
        }
      } else {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) parsedDate = d;
        else {
          const parts = String(rawDate).trim().split(/[\sT]+/);
          const datePart = parts[0];
          const timePart = parts[1] || '00:00:00';
          const subParts = datePart.split(/[/.-]/);
          if (subParts.length === 3) {
            let [p1, p2, p3] = subParts.map(Number);
            if (p3 > 1000) {
              const dTry = new Date(`${p3}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}T${timePart}`);
              if (!isNaN(dTry.getTime())) parsedDate = dTry;
            }
          }
        }
      }
    }

    const rawAccount = accIdx >= 0 ? String(row[accIdx] || '') : 'Main Account';
    const rawToAccount = toAccIdx >= 0 ? String(row[toAccIdx] || '') : '';
    const rawCategory = catIdx >= 0 ? String(row[catIdx] || '') : 'General';
    const rawSubCategory = subCatIdx >= 0 ? String(row[subCatIdx] || '') : '';
    const rawCurrency = currIdx >= 0 ? String(row[currIdx] || '').toUpperCase() : 'USD';

    const descStr = descIdx >= 0 ? String(row[descIdx] || '').trim() : '';
    const noteStr = noteIdx >= 0 ? String(row[noteIdx] || '').trim() : '';
    const fullDesc = [descStr, noteStr].filter(Boolean).join(descStr && noteStr && descStr !== noteStr ? ' - ' : '') || descStr || noteStr;

    let type = 'EXPENSE';
    let amount = 0;

    if (typeIdx >= 0 && row[typeIdx]) {
      const tStr = String(row[typeIdx]).toUpperCase();
      if (tStr.includes('INC') || tStr.includes('DEPOSIT') || tStr.includes('IN')) {
        type = 'INCOME';
      } else if (tStr.includes('TR') || tStr.includes('TRANSFER')) {
        type = 'TRANSFER';
      } else {
        type = 'EXPENSE';
      }
    }

    if (amountIdx >= 0 && row[amountIdx] !== undefined && row[amountIdx] !== '') {
      const valNum = parseNumericVal(row[amountIdx]);
      if (valNum !== null) {
        if (valNum < 0) {
          amount = Math.abs(valNum);
          if (typeIdx < 0) type = 'EXPENSE';
        } else {
          amount = valNum;
        }
      }
    } else if (incomeIdx >= 0 && row[incomeIdx] !== undefined && row[incomeIdx] !== '') {
      const valNum = parseNumericVal(row[incomeIdx]);
      if (valNum !== null && valNum > 0) {
        amount = valNum;
        type = 'INCOME';
      }
    } else if (expenseIdx >= 0 && row[expenseIdx] !== undefined && row[expenseIdx] !== '') {
      const valNum = parseNumericVal(row[expenseIdx]);
      if (valNum !== null && valNum > 0) {
        amount = valNum;
        type = 'EXPENSE';
      }
    }

    if (amount <= 0) continue;

    // Currency conversion logic (Converted Amount & Exchange Rate)
    let convertedAmount = amount;
    let exchangeRate = 1.0;

    const rawConvVal = convertedAmtIdx >= 0 ? parseNumericVal(row[convertedAmtIdx]) : null;
    const rawRateVal = rateIdx >= 0 ? parseNumericVal(row[rateIdx]) : null;

    if (rawConvVal !== null && rawConvVal > 0) {
      convertedAmount = rawConvVal;
      if (amount > 0) {
        exchangeRate = Number((convertedAmount / amount).toFixed(6));
      }
    } else if (rawRateVal !== null && rawRateVal > 0) {
      exchangeRate = rawRateVal;
      convertedAmount = Number((amount * exchangeRate).toFixed(2));
    }

    const accountRef = getAccountRef(rawAccount, rawCurrency);
    let toAccountRef = null;
    if (type === 'TRANSFER' && rawToAccount.trim()) {
      toAccountRef = getAccountRef(rawToAccount, rawCurrency);
    }
    const categoryRef = getCategoryRef(rawCategory, rawSubCategory, type);

    transactions.push({
      clientTxId: `imp_${i}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      accountRef,
      toAccountRef,
      categoryRef,
      type,
      amount,
      currency: rawCurrency || 'USD',
      convertedAmount,
      exchangeRate,
      date: parsedDate.toISOString(),
      description: fullDesc,
      note: fullDesc
    });
  }

  return {
    version: '1.0',
    app: 'ImportedSpreadsheet',
    exportedAt: new Date().toISOString(),
    accounts: Object.values(accountMap),
    categories: Object.values(categoryMap),
    transactions
  };
};

// Helper: Parse XLSX buffer using ExcelJS
export const parseXLSXBuffer = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  let accountsFromSheet = [];
  const accSheet = workbook.getWorksheet('Accounts');
  if (accSheet) {
    const accRows = [];
    accSheet.eachRow({ includeEmpty: false }, (row) => {
      accRows.push(row.values.slice(1).map(getCellValue));
    });
    if (accRows.length > 1) {
      const headers = accRows[0].map(h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
      const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('account'));
      const typeIdx = headers.findIndex(h => h.includes('type'));
      const balIdx = headers.findIndex(h => h.includes('balance'));
      const currIdx = headers.findIndex(h => h.includes('currency'));

      for (let i = 1; i < accRows.length; i++) {
        const r = accRows[i];
        const name = nameIdx >= 0 ? r[nameIdx] : r[0];
        if (name) {
          accountsFromSheet.push({
            name,
            type: typeIdx >= 0 ? r[typeIdx] : 'SAVINGS',
            balance: balIdx >= 0 ? parseFloat(r[balIdx]) || 0 : 0,
            currency: currIdx >= 0 ? r[currIdx] : 'USD'
          });
        }
      }
    }
  }

  let txSheet = workbook.getWorksheet('Transactions');
  if (!txSheet) {
    txSheet = workbook.worksheets.find(w => w.name !== 'Summary' && w.name !== 'Accounts') || workbook.worksheets[0];
  }

  if (!txSheet) return null;

  const txRows = [];
  txSheet.eachRow({ includeEmpty: false }, (row) => {
    txRows.push(row.values.slice(1).map(getCellValue));
  });

  if (txRows.length < 2) return null;

  return convertRowsToPayload(txRows, accountsFromSheet);
};

// Helper: Parse Realbyte Money Manager (.mmbak / SQLite) database
export const parseMmbakBuffer = async (fileBuffer) => {
  let tmpPath = null;
  try {
    let DatabaseSync;
    try {
      const sqliteMod = await import('node:sqlite');
      DatabaseSync = sqliteMod.DatabaseSync;
    } catch (_) {}

    if (!DatabaseSync) {
      console.error('node:sqlite is not available in this Node runtime environment.');
      return null;
    }

    tmpPath = path.join(os.tmpdir(), `mmbak_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);
    fs.writeFileSync(tmpPath, fileBuffer);

    const db = new DatabaseSync(tmpPath);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = new Set(tables.map(t => t.name));

    if (!tableNames.has('INOUTCOME') && !tableNames.has('ASSETS') && !tableNames.has('ZCATEGORY')) {
      db.close();
      return null;
    }

    // 1. Accounts (ASSETS)
    let accounts = [];
    if (tableNames.has('ASSETS')) {
      const assetRows = db.prepare('SELECT * FROM ASSETS').all();
      accounts = assetRows.map(row => {
        let curr = 'MYR';
        if (row.currencyUid) {
          const parts = row.currencyUid.split('_');
          curr = parts[parts.length - 1] || parts[0] || 'MYR';
        }
        let type = 'SAVINGS';
        const nameLower = (row.NIC_NAME || '').toLowerCase();
        if (nameLower.includes('cash')) type = 'CASH';
        else if (nameLower.includes('card') || nameLower.includes('credit')) type = 'CARD';
        else if (nameLower.includes('wallet') || nameLower.includes('tng') || nameLower.includes('touch n go') || nameLower.includes('boost') || nameLower.includes('grab') || nameLower.includes('shopee') || nameLower.includes('paypal') || nameLower.includes('venmo')) type = 'E-WALLET';
        else if (nameLower.includes('invest') || nameLower.includes('stock')) type = 'INVESTMENT';
        else if (nameLower.includes('crypto')) type = 'CRYPTO';

        return {
          oldId: row.uid || String(row.ID),
          name: row.NIC_NAME || (`Account ${row.ID}`),
          type,
          balance: parseFloat(row.AMOUNT_ACCOUNT || 0),
          currency: curr
        };
      });
    }

    // 2. Categories (ZCATEGORY)
    let categories = [];
    if (tableNames.has('ZCATEGORY')) {
      const catRows = db.prepare('SELECT * FROM ZCATEGORY').all();
      categories = catRows.map(row => {
        return {
          oldId: row.uid || String(row.ID),
          name: row.NAME || 'General',
          type: row.TYPE === 0 ? 'INCOME' : 'EXPENSE',
          parentId: (row.pUid && row.pUid !== '0') ? row.pUid : null,
          emoji: '',
          color: '#94a3b8'
        };
      });
    }

    // 3. Transactions (INOUTCOME)
    let transactions = [];
    if (tableNames.has('INOUTCOME')) {
      const txRows = db.prepare('SELECT * FROM INOUTCOME WHERE IS_DEL IS NULL OR IS_DEL = 0').all();
      const seenTransUids = new Set();

      for (const row of txRows) {
        const doType = String(row.DO_TYPE || '1');
        
        // Skip duplicate transfer entries (DO_TYPE 3 & 4 share txUidTrans)
        if ((doType === '3' || doType === '4') && row.txUidTrans) {
          if (seenTransUids.has(row.txUidTrans)) continue;
          seenTransUids.add(row.txUidTrans);
        }

        let type = 'EXPENSE';
        if (doType === '0' || doType === '8') type = 'INCOME';
        else if (doType === '1' || doType === '7') type = 'EXPENSE';
        else if (doType === '3' || doType === '4') type = 'TRANSFER';

        let dateIso = new Date().toISOString();
        if (row.WDATE) {
          const d = new Date(row.WDATE);
          if (!isNaN(d.getTime())) dateIso = d.toISOString();
        } else if (row.ZDATE) {
          const ts = parseInt(row.ZDATE);
          if (!isNaN(ts)) dateIso = new Date(ts).toISOString();
        }

        let curr = 'MYR';
        if (row.currencyUid) {
          const parts = row.currencyUid.split('_');
          curr = parts[parts.length - 1] || parts[0] || 'MYR';
        }

        const amount = Math.abs(parseFloat(row.ZMONEY || row.AMOUNT_ACCOUNT || 0));
        if (amount === 0) continue;

        transactions.push({
          clientTxId: row.uid ? `mm_${row.uid}` : `mm_${row.AID}`,
          accountRef: row.assetUid || '',
          toAccountRef: (type === 'TRANSFER' ? row.toAssetUid : null) || null,
          categoryRef: (type !== 'TRANSFER' ? row.ctgUid : null) || null,
          type,
          amount,
          currency: curr,
          convertedAmount: amount,
          exchangeRate: 1.0,
          date: dateIso,
          description: row.ZCONTENT || '',
          note: row.ZCONTENT || ''
        });
      }
    }

    db.close();

    return {
      version: '1.0',
      app: 'MoneyManager',
      exportedAt: new Date().toISOString(),
      accounts,
      categories,
      transactions
    };
  } catch (err) {
    console.error('Error parsing .mmbak file:', err);
    return null;
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
  }
};

// Helper: Extract data from .mmbak archive, .xlsx, .csv, or raw JSON
export const parseBackupFile = async (fileBuffer, originalFilename = '') => {
  const filename = (originalFilename || '').toLowerCase();

  // Check if .mmbak or SQLite header magic bytes ("SQLite format 3")
  const isSqliteHeader = fileBuffer.length > 16 && fileBuffer.subarray(0, 16).toString('ascii').startsWith('SQLite format 3');
  if (filename.endsWith('.mmbak') || filename.endsWith('.sqlite') || filename.endsWith('.db') || isSqliteHeader) {
    try {
      const payload = await parseMmbakBuffer(fileBuffer);
      if (payload) return payload;
    } catch (e) {
      console.error('Error parsing .mmbak SQLite buffer:', e);
    }
  }

  if (filename.endsWith('.xlsx')) {
    try {
      const payload = await parseXLSXBuffer(fileBuffer);
      if (payload) return payload;
    } catch (e) {
      console.error('Error parsing XLSX file:', e);
    }
  }

  const rawStr = fileBuffer.toString('utf8');
  if (rawStr.trim().startsWith('{') || rawStr.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(rawStr);
      if (parsed && typeof parsed === 'object') {
        if (parsed.encrypted || parsed.transactions || parsed.accounts) {
          return parsed;
        }
      }
    } catch (_) {}
  }

  try {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();

    let sqliteEntry = zipEntries.find(e => e.entryName.endsWith('.mmbak') || e.entryName.endsWith('.sqlite') || e.entryName.endsWith('.db'));
    if (sqliteEntry) {
      const payload = await parseMmbakBuffer(sqliteEntry.getData());
      if (payload) return payload;
    }

    let jsonEntry = zipEntries.find(e => e.entryName.endsWith('.json'));
    let csvEntry = zipEntries.find(e => e.entryName.endsWith('.csv'));
    let hasXlsxEntries = zipEntries.some(e => e.entryName.includes('xl/workbook.xml') || e.entryName.includes('xl/worksheets/'));

    if (jsonEntry) {
      const content = jsonEntry.getData().toString('utf8');
      const parsed = JSON.parse(content);
      if (parsed) return parsed;
    }
    if (csvEntry) {
      const csvStr = csvEntry.getData().toString('utf8');
      const rows = parseCSVText(csvStr);
      return convertRowsToPayload(rows);
    }
    if (hasXlsxEntries) {
      const payload = await parseXLSXBuffer(fileBuffer);
      if (payload) return payload;
    }
  } catch (e) {
    // Not a zip file
  }

  try {
    const payload = await parseXLSXBuffer(fileBuffer);
    if (payload && payload.transactions && payload.transactions.length > 0) {
      return payload;
    }
  } catch (_) {}

  try {
    const rows = parseCSVText(rawStr);
    if (rows && rows.length > 1) {
      const payload = convertRowsToPayload(rows);
      if (payload && payload.transactions && payload.transactions.length > 0) {
        return payload;
      }
    }
  } catch (_) {}

  return null;
};

// Helper: Remove emojis and unicode symbols from text for clean exports (PDF, CSV, XLSX)
export const stripEmojis = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{200D}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};
