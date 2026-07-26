import api from './axios';

export const createTreatment        = (data)       => api.post('/treatments', data);
export const updateTreatment        = (id, data)   => api.patch(`/treatments/${id}`, data);
export const getTreatmentsByPatient = (patientId, params) => api.get(`/treatments/patient/${patientId}`, { params });
export const getTreatment           = (id)         => api.get(`/treatments/${id}`);
