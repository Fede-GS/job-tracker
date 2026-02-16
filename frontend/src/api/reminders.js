import client from './client';

export const getReminders = (params = {}) =>
  client.get('/reminders', { params });

export const getUpcomingReminders = () =>
  client.get('/reminders/upcoming');

export const createReminder = (applicationId, data) =>
  client.post(`/applications/${applicationId}/reminders`, data);

export const dismissReminder = (id) =>
  client.patch(`/reminders/${id}/dismiss`);

export const deleteReminder = (id) =>
  client.delete(`/reminders/${id}`);
