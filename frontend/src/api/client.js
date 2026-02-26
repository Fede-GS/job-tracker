import axios from 'axios';

// In production, VITE_API_BASE_URL points to the deployed backend
// (e.g. https://finixjob-api.onrender.com/api).
// In development, it falls back to '/api' which Vite proxies to localhost:5000.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token to every request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors + 401 redirect
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || 'Something went wrong';

    // If 401 (unauthorized/expired), clear token and redirect to login
    if (status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // Only redirect if not already on auth pages
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ message, status });
  }
);

export default client;
