import { Router } from 'express';
import { communityQueriesStore } from '../services/storeService.ts';

export const communityRouter = Router();

// Get all community queries
communityRouter.get('/community/queries', (_req, res) => {
  res.json({ success: true, queries: communityQueriesStore });
});

// Post a new community query (Citizen)
communityRouter.post('/community/queries', (req, res) => {
  const { citizenName, district, city, question } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, error: 'Question is required.' });
  }

  const newQuery = {
    id: 'QRY-' + Math.floor(1000 + Math.random() * 9000),
    citizenName: citizenName || 'Citizen',
    district: district || '',
    city: city || '',
    question: question.trim(),
    createdAt: new Date().toISOString(),
    answers: []
  };

  communityQueriesStore.unshift(newQuery);
  res.json({ success: true, message: 'Query posted successfully to district operators feed!', query: newQuery });
});

// Post an answer to a community query (Operator)
communityRouter.post('/community/queries/:id/answer', (req, res) => {
  const { id } = req.params;
  const { operatorName, operatorPhone, answerText } = req.body;
  
  const query = communityQueriesStore.find(q => q.id === id);
  if (!query) return res.status(404).json({ success: false, error: 'Query not found.' });

  if (!answerText || !answerText.trim()) {
    return res.status(400).json({ success: false, error: 'Answer text is required.' });
  }

  const newAnswer = {
    id: 'ans-' + Date.now(),
    operatorName: operatorName || 'Jan Seva Kendra Operator',
    operatorPhone: operatorPhone || '9876543210',
    answerText: answerText.trim(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  query.answers.push(newAnswer);
  res.json({ success: true, message: 'Answer posted successfully!', query });
});
