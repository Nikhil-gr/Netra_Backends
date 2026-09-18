import { GoogleGenAI } from '@google/genai';
import { ApiError } from '../utils/apiResponse.js';

let client;

export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new ApiError(503, 'GEMINI_NOT_CONFIGURED', 'Set GEMINI_API_KEY on the backend to enable image analysis.');
  }

  client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY.trim(),
    httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } },
  });
  return client;
}

export const getGeminiModel = () => process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite';
