import api from './axios';

export const askAssistant = (question) => api.post('/ai/chat', { question });
