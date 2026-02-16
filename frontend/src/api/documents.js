import client from './client';
import axios from 'axios';

export const getDocuments = (applicationId) =>
  client.get(`/applications/${applicationId}/documents`);

export const uploadDocument = (applicationId, file, docCategory = 'cv') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('doc_category', docCategory);
  return axios.post(`/api/applications/${applicationId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);
};

export const downloadDocument = (docId) =>
  `/api/documents/${docId}/download`;

export const deleteDocument = (docId) =>
  client.delete(`/documents/${docId}`);
