import client from './client';

export const parseJobPost = (text) =>
  client.post('/ai/parse-job-post', { text });

export const generateCV = (data) =>
  client.post('/ai/generate-cv', data);

export const generateCoverLetter = (data) =>
  client.post('/ai/generate-cover-letter', data);

export const summarizeApplication = (applicationId) =>
  client.post('/ai/summarize-application', { application_id: applicationId });

export const improveText = (text, instructions) =>
  client.post('/ai/improve-text', { text, instructions });

export const generateFollowup = (applicationId, context) =>
  client.post('/ai/generate-followup', { application_id: applicationId, context });

export const generateInterviewPrep = (applicationId) =>
  client.post('/ai/interview-prep', { application_id: applicationId });

export const tailorCvTemplate = (data) =>
  client.post('/ai/tailor-cv-template', data);

export const tailorCoverLetter = (data) =>
  client.post('/ai/tailor-cover-letter', data);

export const extractApplyMethod = (jobPosting) =>
  client.post('/ai/extract-apply-method', { job_posting: jobPosting });

export const scrapeJobUrl = (url) =>
  client.post('/ai/scrape-job-url', { url });

// Career Consultant API
export const careerConsultantChat = (data) =>
  client.post('/ai/career-consultant/chat', data);

export const getConsultantSessions = (applicationId) =>
  client.get('/ai/career-consultant/sessions', { params: applicationId ? { application_id: applicationId } : {} });

export const createConsultantSession = (data) =>
  client.post('/ai/career-consultant/sessions', data);

export const getConsultantSession = (sessionId) =>
  client.get(`/ai/career-consultant/sessions/${sessionId}`);

export const deleteConsultantSession = (sessionId) =>
  client.delete(`/ai/career-consultant/sessions/${sessionId}`);

export const assignSessionToApplication = (sessionId, applicationId) =>
  client.post(`/ai/career-consultant/sessions/${sessionId}/assign`, { application_id: applicationId });
