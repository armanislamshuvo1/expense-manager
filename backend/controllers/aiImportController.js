import Category from '../models/Category.js';
import Account from '../models/Account.js';
import { generateContentWithFallback } from '../services/aiService.js';

export const aiAnalyzeImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { items = [] } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items provided for AI analysis.' });
    }

    const userCategories = await Category.find({ userId }).lean();
    const userAccounts = await Account.find({ userId }).lean();

    const catListStr = userCategories.map(c => `${c.name} (${c.type})`).join(', ');
    const accListStr = userAccounts.map(a => a.name).join(', ');

    // Sample first 20 items to avoid token overflow
    const sampleItems = items.slice(0, 20).map(i => ({
      date: i.date,
      amount: i.amount,
      category: i.categoryRef || i.category || '',
      rawDescription: i.description || i.note || ''
    }));

    if (!process.env.GEMINI_API_KEY) {
      // Graceful fallback if GEMINI_API_KEY is not configured
      return res.status(200).json({
        success: true,
        aiEnabled: false,
        summary: `Analyzed ${items.length} items. (AI API Key not configured, using direct mapping fallback).`,
        mappedItems: items
      });
    }

    const prompt = `
You are an expert AI financial assistant helping users import transactions into ExpenseManager.
Existing Categories: [${catListStr}]
Existing Accounts: [${accListStr}]

Import Sample Items: ${JSON.stringify(sampleItems)}

Perform 3 tasks:
1. Map imported raw categories/descriptions to the most accurate existing category name from the list above. If no match exists, suggest a new clean category name.
2. Clean up messy bank description strings (e.g. "POS PUR 07/20 UBER TRIP" -> "Uber").
3. Provide a concise, friendly 2-sentence summary of the import analysis.

Return ONLY a JSON object formatted as:
{
  "summary": "AI summary text here...",
  "cleanedItems": [
    {
      "index": 0,
      "suggestedCategory": "Category Name",
      "cleanDescription": "Clean Merchant Name"
    }
  ]
}
`;

    const result = await generateContentWithFallback(prompt);
    const responseText = result.response.text();

    let aiData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      aiData = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      aiData = {
        summary: `Successfully parsed ${items.length} imported records.`,
        cleanedItems: []
      };
    }

    res.status(200).json({
      success: true,
      aiEnabled: true,
      summary: aiData.summary,
      cleanedItems: aiData.cleanedItems
    });
  } catch (err) {
    console.error('AI Import Error:', err);
    // Fallback response on error
    res.status(200).json({
      success: true,
      aiEnabled: false,
      summary: `Analyzed ${req.body.items?.length || 0} items.`,
      cleanedItems: []
    });
  }
};
