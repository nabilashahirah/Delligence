import axios from 'axios';
import { API_URL } from '../config';

// Separate axios instance — no JWT interceptors needed
const publicApi = axios.create({
  baseURL: `${API_URL}/public`,
  headers: { 'Content-Type': 'application/json' },
});

export const lookupPatient    = (ic)               => publicApi.get('/lookup', { params: { ic } });
export const getSlots         = (dentist, date)    => publicApi.get('/slots', { params: { dentist, date } });
export const bookAppointment  = (data)             => publicApi.post('/book', data);
export const getAppointment   = (id)               => publicApi.get(`/appointment/${id}`);
export const selfCheckin      = (id)               => publicApi.patch(`/checkin/${id}`);
export const getQueueStatus   = (ic)               => publicApi.get('/queue-status', { params: { ic } });
export const selfCancel       = (id, reason)       => publicApi.patch(`/cancel/${id}`, { reason: reason || null });
