import api from './axios';

export const getQueue = (params) => api.get('/queue', { params });
