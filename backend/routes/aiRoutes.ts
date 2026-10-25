import { Router } from 'express';
import { handleAiAssistantQuery } from '../services/aiService.ts';

export const aiRouter = Router();

aiRouter.post('/ai/assist', async (req, res) => {
  try {
    const { prompt, serviceType, userQuery } = req.body;
    const text = await handleAiAssistantQuery(prompt, serviceType, userQuery);
    res.json({ success: true, text });
  } catch (err) {
    console.error('AI assistant route error:', err);
    const message = err instanceof Error ? err.message : 'AI assistant is temporarily unavailable. Please try again.';
    // Busy/transient ya config-missing errors par 503 (client retry kar sakta hai),
    // baaki unexpected failures par 502.
    const status = /busy right now|model is unavailable|not configured|Enter a question/i.test(message) ? 503 : 502;
    res.status(status).json({ success: false, error: message });
  }
});
