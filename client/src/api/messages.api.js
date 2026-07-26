import api from './axios';

export const sendPromo = ({ message, segment }) =>
  api.post('/messages/promo', { message, segment });

export const listMessages = ({ page = 1, limit = 50, event } = {}) =>
  api.get('/messages', { params: { page, limit, event } });

export const messageStats = () =>
  api.get('/messages/stats');

export const draftPromo = ({ brief, tone }) =>
  api.post('/messages/draft', { brief, tone });
