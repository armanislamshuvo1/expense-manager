import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateContentWithFallback = async (generateArgs, generationConfig = {}, systemInstruction = null) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const modelsToTry = [
    process.env.GEMINI_MODEL, // Configured model (defaulting to fast gemini-3.5-flash)
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ].filter(Boolean);

  // Remove duplicates
  const uniqueModels = [...new Set(modelsToTry)];

  let lastError;
  for (const modelName of uniqueModels) {
    try {
      console.log(`[AI] Attempting call with model: ${modelName}`);
      const modelOptions = { model: modelName, generationConfig };
      if (systemInstruction) {
        modelOptions.systemInstruction = systemInstruction;
      }
      // 8-second timeout per model so hanging/503 spikes failover rapidly
      const model = genAI.getGenerativeModel(modelOptions, { timeout: 8000 });
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
