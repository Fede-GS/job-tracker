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
