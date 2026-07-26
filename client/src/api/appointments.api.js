import api from './axios';

export const getAppointments   = (params) => api.get('/appointments', { params });
export const getAppointment    = (id)     => api.get(`/appointments/${id}`);
export const createAppointment = (data)   => api.post('/appointments', data);
export const updateStatus      = (id, status) => api.patch(`/appointments/${id}/status`, { status });
export const checkConflict     = (dentist, scheduledAt, duration) =>
  api.get('/appointments/conflict', { params: { dentist, scheduled_at: scheduledAt, duration } });
export const rescheduleAppointment = (id, data) => api.patch(`/appointments/${id}/reschedule`, data);
export const updateAppointment     = (id, data) => api.patch(`/appointments/${id}`, data);
