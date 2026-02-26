import api from './client';

export const getInterviews = (applicationId) =>
  api.get(`/applications/${applicationId}/interviews`);

export const createInterview = (applicationId, interviewData) =>
  api.post(`/applications/${applicationId}/interviews`, interviewData);

export const updateInterview = (applicationId, interviewId, interviewData) =>
  api.put(`/applications/${applicationId}/interviews/${interviewId}`, interviewData);

export const deleteInterview = (applicationId, interviewId) =>
  api.delete(`/applications/${applicationId}/interviews/${interviewId}`);
