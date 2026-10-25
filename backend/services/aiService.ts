import { GoogleGenAI } from '@google/genai';
import { readEnvValue } from '../env.ts';

let ai: GoogleGenAI | null = null;

// Request ko kabhi infinite hang na hone do — Gemini call par hard timeout.
const AI_REQUEST_TIMEOUT_MS = 15000;

// Valid, currently-supported Gemini models (pehla jo chale wahi use hoga).
// NOTE: Google ne naye models par shift kiya hai — API khud list deta hai, isliye
// candidates me sabse naya pehle rakha gaya hai.
const DEFAULT_MODEL_CANDIDATES = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

function getAiClient(): GoogleGenAI | null {
  const apiKey = readEnvValue('GEMINI_API_KEY');
  if (!apiKey) return null;
  if (!ai) {
    ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: AI_REQUEST_TIMEOUT_MS } });
  }
  return ai;
}

function getModelCandidates(): string[] {
  const configured = (readEnvValue('GEMINI_MODEL') || '').trim();
  const candidates = configured ? [configured, ...DEFAULT_MODEL_CANDIDATES] : [...DEFAULT_MODEL_CANDIDATES];
  return [...new Set(candidates.filter(Boolean))];
}

// Error string se HTTP status nikalo taaki sahi decision le sakein.
function statusOf(err: unknown): number | null {
  const raw = err instanceof Error ? err.message : String(err);
  const match = raw.match(/"code"\s*:\s*(\d{3})/) || raw.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : null;
}

export async function handleAiAssistantQuery(prompt?: string, serviceType?: string, userQuery?: string): Promise<string> {
  const query = prompt || userQuery || '';
  if (!query.trim()) {
    throw new Error('Enter a question for the AI assistant.');
  }
  const ai = getAiClient();
  if (!ai) {
    throw new Error('AI assistant is not configured. Set GEMINI_API_KEY on the server.');
  }

  const systemInstruction = 'You are DigiSeva AI Assistant, an expert digital cyber café assistant and government form-filling guide in India. Answer concisely and professionally in clear English. If you are uncertain about current official fees, eligibility, or requirements, say so and direct the user to the relevant government portal.';
  const contents = [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nService: ${serviceType || 'General'}\nQuery: ${query}` }] }];

  let lastError: unknown = null;
  for (const model of getModelCandidates()) {
    try {
      const response = await ai.models.generateContent({ model, contents });
      if (response.text) {
        return response.text;
      }
      lastError = new Error('The AI service returned an empty response.');
    } catch (err) {
      lastError = err;
      const status = statusOf(err);
      console.warn(`AI assistant model "${model}" failed (status ${status ?? '?'}):`, err instanceof Error ? err.message : err);
      // 503/429/5xx ya timeout = model valid hai par abhi busy — fallback try karne ka
      // koi fayda nahi, seedha user-friendly error do (hang mat karo).
      if (status === 503 || status === 429 || status === 500 || status === 502 || status === 504) {
        throw new Error('The AI assistant is busy right now. Please try again in a moment.');
      }
      // 404 = model available nahi — agli candidate try karo.
    }
  }

  const finalStatus = statusOf(lastError);
  if (finalStatus === 404) {
    throw new Error('The AI assistant model is unavailable. Please update GEMINI_MODEL on the server.');
  }
  throw lastError instanceof Error ? lastError : new Error('The AI assistant is temporarily unavailable.');
}
