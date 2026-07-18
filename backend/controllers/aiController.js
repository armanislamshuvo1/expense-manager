const { GoogleGenerativeAI } = require('@google/generative-ai');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

const generateContentWithFallback = async (generateArgs) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const modelsToTry = [
    process.env.GEMINI_MODEL, // E.g., gemini-3.5-flash
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash'
  ].filter(Boolean);


  // Remove duplicates
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError;
  for (const modelName of uniqueModels) {
    try {
      console.log(`[AI] Attempting call with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(generateArgs);
      return result;
    } catch (err) {
      console.warn(`[AI Warning] Model ${modelName} failed:`, err.message || err);
      lastError = err;
    }
  }
  throw lastError;
};



// Helper to convert file buffer to Gemini inline data
const bufferToGenerativePart = (buffer, mimeType) => {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };
};

/**
 * 1. Parse natural language inputs into transaction structures
 */
exports.parseTransaction = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, message: 'Text input is required' });
    }

    // Secure Data Fetching scoped strictly to authenticated user
    const accounts = await Account.find({ userId: req.user.id });
    const categories = await Category.find({ userId: req.user.id });

    const systemInstruction = `
      You are an expert personal finance assistant. Parse the user's text into a structured JSON transaction.
      Available Accounts: ${JSON.stringify(accounts.map(a => ({ id: a._id, name: a.name, type: a.type, currency: a.currency })))}
      Available Categories: ${JSON.stringify(categories.map(c => ({ id: c._id, name: c.name, type: c.type, emoji: c.emoji })))}

      Rules:
      - Match the account to the closest available account. If no account matches, map to the user's first account.
      - Match the category to the closest available category of correct type (INCOME or EXPENSE). If no category matches, choose a generic fallback category.
      - Parse the amount as a number.
      - Parse the date (format YYYY-MM-DD). If no date is mentioned, use today's date (${new Date().toISOString().split('T')[0]}).
      - Identify the type: 'INCOME', 'EXPENSE', or 'TRANSFER'.
      - Extract the merchant name or a brief summary as 'note' (maximum 30 characters). Extract other details or detailed context as 'description'.
      - If it is a TRANSFER, match 'accountId' (source) and 'toAccountId' (destination), and set categoryId to null.

      Output strictly valid JSON with this structure:
      {
        "amount": number,
        "type": "INCOME" | "EXPENSE" | "TRANSFER",
        "date": "YYYY-MM-DD",
        "description": "extracted detailed description or other details",
        "note": "merchant name or brief summary (maximum 30 characters)",
        "accountId": "matched_account_id",
        "toAccountId": "matched_to_account_id_or_null",
        "categoryId": "matched_category_id_or_null"
      }
      Do not wrap with markdown formatting or backticks. Return raw JSON.
    `;

    const prompt = `<user_input>${text}</user_input>`;

    const response = await generateContentWithFallback([systemInstruction, prompt]);

    const cleanJson = response.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(cleanJson);

    res.status(200).json({ success: true, data: parsedData });

  } catch (error) {
    console.error('Error in parseTransaction:', error);
    res.status(500).json({ success: false, message: 'AI parsing failed. Please enter manually.' });
  }
};

/**
 * 2. Scan image receipts using Gemini Vision
 */
exports.scanReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No receipt image uploaded' });
    }

    const accounts = await Account.find({ userId: req.user.id });
    const categories = await Category.find({ userId: req.user.id });

    const imagePart = bufferToGenerativePart(req.file.buffer, req.file.mimetype);

    const systemInstruction = `
      You are an expert receipt parsing tool. Extract information from the receipt image.
      Available Accounts: ${JSON.stringify(accounts.map(a => ({ id: a._id, name: a.name })))}
      Available Categories: ${JSON.stringify(categories.map(c => ({ id: c._id, name: c.name, type: c.type })))}

      Output strictly valid JSON with this structure:
      {
        "amount": number,
        "type": "EXPENSE",
        "date": "YYYY-MM-DD",
        "description": "extracted line items or receipt info (other details)",
        "note": "merchant name (maximum 30 characters)",
        "accountId": "matched_account_id",
        "categoryId": "matched_category_id"
      }
      If the date is not readable or missing, use today's date (${new Date().toISOString().split('T')[0]}).
      Map category and account to the closest IDs provided.
      Do not include markdown wrappers. Return raw JSON.
    `;

    const response = await generateContentWithFallback([systemInstruction, imagePart]);
    const cleanJson = response.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();


    const parsedData = JSON.parse(cleanJson);

    res.status(200).json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Error in scanReceipt:', error);
    res.status(500).json({ success: false, message: 'Failed to scan receipt.' });
  }
};

/**
 * 3. AI Advisor Chat
 */
exports.advisorChat = async (req, res, next) => {
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

    // Format transaction digest to protect specific sensitive data
    const transactionSummary = transactions.map(t => ({
      amount: t.amount,
      currency: t.currency,
      type: t.type,
      date: t.date.toISOString().split('T')[0],
      category: t.categoryId ? t.categoryId.name : 'Transfer',
      account: t.accountId ? t.accountId.name : 'Unknown'
    }));

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
exports.getInsights = async (req, res, next) => {
  let anomalies = [];
  try {

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

    // 1. Core Anomaly Detection (Simple outlier checks: transactions > 3x the category average)
    const categoryTotals = {};
    const categoryCounts = {};
    transactions.forEach(t => {
      if (!t.categoryId) return;
      const catName = t.categoryId.name;
      categoryTotals[catName] = (categoryTotals[catName] || 0) + t.amount;
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });

    const categoryAverages = {};
    Object.keys(categoryTotals).forEach(cat => {
      categoryAverages[cat] = categoryTotals[cat] / categoryCounts[cat];
    });

    anomalies = [];

    transactions.slice(0, 10).forEach(t => {
      if (!t.categoryId) return;
      const catName = t.categoryId.name;
      const avg = categoryAverages[catName];
      // If a recent transaction is > 3x the average of that category, tag it as an anomaly
      if (t.amount > avg * 3 && t.amount > 100) {
        anomalies.push({
          id: t._id,
          amount: t.amount,
          category: catName,
          date: t.date.toISOString().split('T')[0],
          description: t.description || t.note || 'No description',
          reason: `This transaction is 3x higher than your average spend of $${avg.toFixed(2)} in ${catName}.`
        });
      }
    });

    // 2. Generate Weekly/Monthly AI Summary Text
    const cleanList = transactions.slice(0, 30).map(t => ({
      amount: t.amount,
      type: t.type,
      category: t.categoryId ? t.categoryId.name : 'Transfer',
      date: t.date.toISOString().split('T')[0]
    }));

    const prompt = `
      Create a brief 2-3 sentence visual summary digest for the user's recent spending patterns:
      Recent transactions list: ${JSON.stringify(cleanList)}
      Be friendly, brief, and highlight where they saved money or spent the most.
    `;

    const result = await generateContentWithFallback(prompt);
    const digestText = result.response.text();


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

