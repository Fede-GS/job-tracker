import client from './client';

export const getStats = () =>
  client.get('/dashboard/stats');

export const getTimeline = (period = 'monthly') =>
  client.get('/dashboard/timeline', { params: { period } });

export const getRecent = () =>
  client.get('/dashboard/recent');

export const getDeadlineAlerts = () =>
  client.get('/dashboard/deadline-alerts');

export const getFunnel = () =>
  client.get('/dashboard/funnel');

export const getFollowupSuggestions = () =>
  client.get('/dashboard/followup-suggestions');
