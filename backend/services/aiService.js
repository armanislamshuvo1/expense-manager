import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateContentWithFallback = async (generateArgs) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const modelsToTry = [
    process.env.GEMINI_MODEL, // Configured model
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-flash-latest', // 1.5 Flash alias
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-2.5-pro',
    'gemini-pro-latest' // 1.5 Pro alias
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
export const bufferToGenerativePart = (buffer, mimeType) => {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };
};
