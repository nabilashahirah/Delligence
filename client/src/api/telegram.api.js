import api from './axios';

export const createLinkToken = (ic) =>
  api.post('/telegram/link-token', { ic });

export const getLinkStatus = (ic) =>
  api.get('/telegram/status', { params: { ic } });

export const optout = (ic) =>
  api.post('/telegram/optout', { ic });
