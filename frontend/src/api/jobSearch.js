import client from './client';

export const searchJobs = (params = {}) =>
  client.get('/job-search/search', { params });

export const analyzeJobMatch = (data) =>
  client.post('/job-search/analyze-match', data);

export const saveJobApplication = (data) =>
  client.post('/job-search/save-application', data);
