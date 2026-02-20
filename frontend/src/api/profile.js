import api from './client';

export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const uploadCV = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/profile/upload-cv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getOnboardingStatus = () => api.get('/profile/onboarding-status');
export const completeOnboarding = () => api.post('/profile/complete-onboarding');
export const extractCvProfile = (text) => api.post('/ai/extract-cv-profile', { text });
export const matchAnalysis = (jobPosting, profile) => api.post('/ai/match-analysis', { job_posting: jobPosting, profile });
export const tailorCv = (jobPosting, profile, instructions) => api.post('/ai/tailor-cv', { job_posting: jobPosting, profile, instructions });
export const tailorCoverLetter = (jobPosting, profile, company, role, instructions) =>
  api.post('/ai/tailor-cover-letter', { job_posting: jobPosting, profile, company, role, instructions });
export const chatAI = (data) => api.post('/ai/chat', data);
export const generatePdf = (html, docType, applicationId, templateId) =>
  api.post('/ai/generate-pdf', { html, doc_type: docType, application_id: applicationId, template_id: templateId });
export const getDeadlineAlerts = () => api.get('/dashboard/deadline-alerts');
