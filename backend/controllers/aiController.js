import Account from '../models/Account.js';
import Category from '../models/Category.js';
import Transaction from '../models/Transaction.js';
import InsightCache from '../models/InsightCache.js';
import { generateContentWithFallback, bufferToGenerativePart } from '../services/aiService.js';

/**
 * 1. Parse natural language inputs into transaction structures
 */
export const parseTransaction = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, message: 'Text input is required' });
    }

    // Secure Data Fetching scoped strictly to authenticated user
    const accounts = await Account.find({ userId: req.user.id });
    const categories = await Category.find({ userId: req.user.id });

    const currentDate = new Date();
    const todayStr = currentDate.toISOString().split('T')[0];
    const timeStr = currentDate.toTimeString().split(' ')[0]; // "HH:MM:SS"
    const currentDateTimeStr = `${todayStr}T${timeStr}`;

    const systemInstruction = `
      You are an expert personal finance assistant. Parse the user's text into a structured JSON transaction.
      Available Accounts: ${JSON.stringify(accounts.map(a => ({ id: a._id, name: a.name, type: a.type, currency: a.currency })))}
      Available Categories: ${JSON.stringify(categories.map(c => ({ id: c._id, name: c.name, type: c.type, emoji: c.emoji })))}

      Rules:
      - Match the account to the closest available account. If no account matches, map to the user's first account.
      - Match the category to the closest available category of correct type (INCOME or EXPENSE). If no category matches, choose a generic fallback category.
      - Parse the amount as a number.
      - Parse the date and time (format YYYY-MM-DDTHH:mm:ss). If no date or time is mentioned in the text, use the current date and time (${currentDateTimeStr}).
      - If only a date is mentioned (e.g., "yesterday"), default the time part to the current time (${timeStr}).
      - Identify the type: 'INCOME', 'EXPENSE', or 'TRANSFER'.
      - Extract the merchant name or a brief summary as 'note' (maximum 30 characters). Extract other details or detailed context as 'description'.
      - If it is a TRANSFER, match 'accountId' (source) and 'toAccountId' (destination), and set categoryId to null.

      Output strictly valid JSON with this structure:
      {
        "amount": number,
        "type": "INCOME" | "EXPENSE" | "TRANSFER",
        "date": "YYYY-MM-DDTHH:mm:ss",
        "description": "extracted detailed description or other details",
        "note": "merchant name or brief summary (maximum 30 characters)",
        "accountId": "matched_account_id",
        "toAccountId": "matched_to_account_id_or_null",
        "categoryId": "matched_category_id_or_null"
      }
      Do not wrap with markdown formatting or backticks. Return raw JSON.
    `;

    const prompt = `<user_input>${text}</user_input>`;

    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          amount: { type: 'NUMBER' },
          type: { type: 'STRING', enum: ['INCOME', 'EXPENSE', 'TRANSFER'] },
          date: { type: 'STRING' },
          description: { type: 'STRING' },
          note: { type: 'STRING' },
          accountId: { type: 'STRING' },
          toAccountId: { type: 'STRING', nullable: true },
          categoryId: { type: 'STRING', nullable: true }
        },
        required: ['amount', 'type', 'date', 'accountId']
      }
    };

    const response = await generateContentWithFallback([systemInstruction, prompt], generationConfig);

    const cleanJson = response.response.text().trim();
    const parsedData = JSON.parse(cleanJson);

    res.status(200).json({ success: true, data: parsedData });

  } catch (error) {
    console.error('Error in parseTransaction:', error);
    res.status(500).json({ success: false, message: 'AI parsing failed. Please enter manually.' });
  }
};

/**
 * Helper function to validate image magic bytes (file signature)
 * Protects against spoofed file extensions and malicious payloads
 */
const validateMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 12) return false;

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }

  // PNG magic bytes: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  // WEBP magic bytes: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP at offset 8)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  return false;
};

/**
 * 2. Scan image receipts using Gemini Vision
 */
export const scanReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No receipt image uploaded' });
    }

    // Binary file signature (Magic Bytes) security check
    if (!validateMagicBytes(req.file.buffer)) {
      return res.status(400).json({
        success: false,
        message: 'Security error: Invalid image binary signature. Only genuine JPG, PNG, and WEBP files are allowed.'
      });
    }

    const accounts = await Account.find({ userId: req.user.id });
    const categories = await Category.find({ userId: req.user.id });

    const imagePart = bufferToGenerativePart(req.file.buffer, req.file.mimetype);

    const currentDate = new Date();
    const todayStr = currentDate.toISOString().split('T')[0];
    const timeStr = currentDate.toTimeString().split(' ')[0]; // "HH:MM:SS"

    const systemInstruction = `
      You are an expert receipt and invoice security validation and OCR extraction tool.
      
      FIRST STEP - DOCUMENT CLASSIFICATION & VALIDATION:
      Inspect the image carefully to determine if it is a genuine receipt, invoice, bill, payment slip, bank transfer proof, utility bill, POS receipt, or order confirmation summary.
      
      If the image is NOT a receipt, invoice, or payment document (for example: photographs of people, faces, animals, landscapes, generic objects, screenshots of unrelated apps/memes, or non-financial documents):
      Set "isReceipt" to false, and set "error" to a clear, concise explanation explaining why it was rejected (e.g., "The uploaded image appears to be a photograph of a person on a beach, not a receipt or invoice.").
      
      If the image IS a valid receipt, invoice, or payment document:
      Set "isReceipt" to true, "error" to null, and extract the financial data.

      Available Accounts: ${JSON.stringify(accounts.map(a => ({ id: a._id, name: a.name })))}
      Available Categories: ${JSON.stringify(categories.map(c => ({ id: c._id, name: c.name, type: c.type })))}

      Output strictly valid JSON with this exact structure:
      {
        "isReceipt": boolean,
        "error": "Reason for rejection if isReceipt is false, otherwise null",
        "amount": number,
        "type": "EXPENSE",
        "date": "YYYY-MM-DDTHH:mm:ss",
        "description": "extracted line items or receipt details",
        "note": "merchant name (maximum 30 characters)",
        "accountId": "matched_account_id",
        "categoryId": "matched_category_id"
      }

      Formatting Rules for Valid Receipts:
      - Extract both transaction date and time from the receipt image if present.
      - Format date field as ISO 8601 "YYYY-MM-DDTHH:mm:ss".
      - If date or time is not readable or missing, use today's date (${todayStr}) and current time (${timeStr}).
      - If date is present but time is missing, default time to "12:00:00".
      - Map category and account to closest IDs provided.
      - Do not include markdown wrappers or backticks. Return raw JSON.
    `;

    const response = await generateContentWithFallback([systemInstruction, imagePart]);
    const cleanJson = response.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(cleanJson);

    if (parsedData.isReceipt === false) {
      return res.status(400).json({
        success: false,
        message: parsedData.error || 'The uploaded image is not a receipt, invoice, or payment document.'
      });
    }

    res.status(200).json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Error in scanReceipt:', error);
    res.status(500).json({ success: false, message: 'Failed to scan receipt.' });
  }
};

/**
 * Helper to prepare transaction digest for AI analysis, safely preserving notes & descriptions
 */
export const formatTransactionForSummary = (t) => {
  const item = {
    amount: t.amount,
    currency: t.currency || undefined,
    type: t.type,
    category: t.categoryId ? (typeof t.categoryId === 'object' ? t.categoryId.name : t.categoryId) : 'Transfer',
    date: t.date instanceof Date 
      ? t.date.toISOString().split('T')[0] 
      : (typeof t.date === 'string' ? t.date.split('T')[0] : t.date)
  };
  if (t.accountId) {
    item.account = typeof t.accountId === 'object' ? t.accountId.name : t.accountId;
  }
  if (t.note && typeof t.note === 'string' && t.note.trim()) {
    item.note = t.note.trim().slice(0, 50);
  }
  if (t.description && typeof t.description === 'string' && t.description.trim()) {
    item.description = t.description.trim().slice(0, 100);
  }
  return item;
};

/**
 * 3. AI Advisor Chat
 */
export const advisorChat = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Fetch user context safely scoped to this user
    const accounts = await Account.find({ userId: req.user.id });
    const transactions = await Transaction.find({ userId: req.user.id })
      .populate('accountId categoryId')
      .sort({ date: -1 })
      .limit(60); // Limit to avoid prompt token overflow and maintain speed

    // Format transaction digest including notes, merchants, and descriptions
    const transactionSummary = transactions.map(t => formatTransactionForSummary(t));

    const accountSummary = accounts.map(a => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
      currency: a.currency
    }));

    // Prepare system instructions with formatted context
    const systemInstruction = `
      You are "WealthBuddy", a warm, senior financial advisor built into the NexusWealth application.
      Analyze the user's financial state to answer queries concisely.
      Current User Accounts: ${JSON.stringify(accountSummary)}
      Recent User Transactions: ${JSON.stringify(transactionSummary)}

      Guidelines:
      - Give constructive, realistic personal finance tips.
      - Be encouraging, and never judge the user's spendings.
      - Pay close attention to transaction notes (merchants, payees) and descriptions (specific items, reasons) alongside category names to provide deep, personalized context rather than just generic high-level category summaries.
      - Answer questions directly based on the context data when possible.
      - Format key metrics clearly. Keep answers under 3-4 paragraphs.
    `;

    // Construct history parts if available
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(turn => {
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: `${systemInstruction}\n\nUser Question: ${message}` }]
    });

    const result = await generateContentWithFallback({ contents });
    const replyText = result.response.text();

    res.status(200).json({ success: true, data: { text: replyText } });
  } catch (error) {
    console.error('Error in advisorChat:', error);
    res.status(500).json({ success: false, message: 'Failed to generate advisory response.' });
  }
};

/**
 * 4. Generate Dashboard Insights (Weekly Digests & Anomalies)
 */
export const getInsights = async (req, res, next) => {
  let anomalies = [];
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';

    // 1. Check if we have a valid cached version of insights (unless force-refresh requested)
    if (!forceRefresh) {
      const cached = await InsightCache.findOne({ userId: req.user.id });
      if (cached) {
        console.log(`[AI Cache] Serving cached dashboard insights for user: ${req.user.id}`);
        return res.status(200).json({
          success: true,
          data: {
            digest: cached.digest,
            anomalies: cached.anomalies
          }
        });
      }
    } else {
      console.log(`[AI Cache] Force refresh requested for user: ${req.user.id}`);
    }

    const transactions = await Transaction.find({ userId: req.user.id })
      .populate('categoryId')
      .sort({ date: -1 })
      .limit(100);

    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          digest: "Start logging transactions to receive personalized AI digests and alerts!",
          anomalies: []
        }
      });
    }

    // 2. Core Anomaly Detection (Outlier check: EXPENSES only > 3x the category average)
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE' && t.categoryId);
    const categoryTotals = {};
    const categoryCounts = {};
    expenseTransactions.forEach(t => {
      const catName = t.categoryId.name;
      const amt = t.convertedAmount || t.amount;
      categoryTotals[catName] = (categoryTotals[catName] || 0) + amt;
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });

    const categoryAverages = {};
    Object.keys(categoryTotals).forEach(cat => {
      categoryAverages[cat] = categoryTotals[cat] / categoryCounts[cat];
    });

    anomalies = [];

    expenseTransactions.slice(0, 10).forEach(t => {
      const catName = t.categoryId.name;
      const avg = categoryAverages[catName];
      const amt = t.convertedAmount || t.amount;
      // If a recent expense is > 3x the average of that category, tag it as an anomaly
      if (amt > avg * 3 && amt > 100) {
        const curr = t.currency || '';
        anomalies.push({
          id: t._id,
          amount: t.amount,
          currency: curr,
          category: catName,
          date: t.date.toISOString().split('T')[0],
          description: t.description || t.note || 'No description',
          reason: `This expense is 3x higher than your average spend of ${curr} ${avg.toFixed(2)} in ${catName}.`
        });
      }
    });

    // 3. Generate Weekly/Monthly AI Summary Text incorporating notes and descriptions
    const cleanList = transactions.slice(0, 30).map(t => {
      const item = {
        amount: t.amount,
        currency: t.currency || '',
        type: t.type, // 'INCOME', 'EXPENSE', 'TRANSFER'
        category: t.categoryId ? t.categoryId.name : (t.type === 'TRANSFER' ? 'Transfer' : 'General'),
        date: t.date instanceof Date 
          ? t.date.toISOString().split('T')[0] 
          : (typeof t.date === 'string' ? t.date.split('T')[0] : '')
      };
      if (t.note && typeof t.note === 'string' && t.note.trim()) {
        item.note = t.note.trim().slice(0, 50);
      }
      if (t.description && typeof t.description === 'string' && t.description.trim()) {
        item.description = t.description.trim().slice(0, 100);
      }
      return item;
    });

    const prompt = `
      Create a concise, insightful 2-3 sentence visual summary digest for the user's recent financial activity:
      Recent transactions list: ${JSON.stringify(cleanList)}

      Instructions:
      - STRICT RULE: Pay close attention to transaction "type". "INCOME" transactions (such as salary, earnings, refunds, deposits) are inflows/income — NEVER refer to them as spending, purchases, or expenses!
      - Only refer to "EXPENSE" transactions when discussing spending, purchases, or high-cost areas.
      - Call out specific merchants, payees, or items mentioned in transaction notes or descriptions rather than generic categories.
      - Be friendly, brief, and highlight where they saved, earned, or spent the most. Keep it within 2-3 sentences.
    `;

    const result = await generateContentWithFallback(prompt);
    const digestText = result.response.text();

    // 4. Save to InsightCache
    try {
      await InsightCache.findOneAndUpdate(
        { userId: req.user.id },
        { digest: digestText, anomalies, createdAt: new Date() },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (cacheErr) {
      console.error('Error saving dashboard insights to cache:', cacheErr);
    }

    res.status(200).json({
      success: true,
      data: {
        digest: digestText,
        anomalies
      }
    });
  } catch (error) {
    console.error('Error in getInsights:', error);
    // Graceful fallback for rate limits or other AI API errors
    res.status(200).json({
      success: true,
      data: {
        digest: "Financial digests are temporarily unavailable due to high demand on the free AI tier. Please check back shortly!",
        anomalies: anomalies || [] // Pass simple calculated anomalies if they were successfully computed
      }
    });
  }
};
