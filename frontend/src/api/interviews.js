import api from './client';

export const getInterviews = async (applicationId) => {
  const { data } = await api.get(`/applications/${applicationId}/interviews`);
  return data;
};

export const createInterview = async (applicationId, interviewData) => {
  const { data } = await api.post(`/applications/${applicationId}/interviews`, interviewData);
  return data;
};

export const updateInterview = async (applicationId, interviewId, interviewData) => {
  const { data } = await api.put(`/applications/${applicationId}/interviews/${interviewId}`, interviewData);
  return data;
};

export const deleteInterview = async (applicationId, interviewId) => {
  const { data } = await api.delete(`/applications/${applicationId}/interviews/${interviewId}`);
  return data;
};
