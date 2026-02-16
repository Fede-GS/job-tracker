import client from './client';

export const getApplications = (params = {}) =>
  client.get('/applications', { params });

export const getApplication = (id) =>
  client.get(`/applications/${id}`);

export const createApplication = (data) =>
  client.post('/applications', data);

export const updateApplication = (id, data) =>
  client.put(`/applications/${id}`, data);

export const deleteApplication = (id) =>
  client.delete(`/applications/${id}`);

export const changeStatus = (id, data) =>
  client.patch(`/applications/${id}/status`, data);

export const getCalendarApplications = (year, month, status) =>
  client.get('/applications/calendar', { params: { year, month, ...(status && { status }) } });
