import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Add JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error?.message || 'Something went wrong';
    const status = error.response?.status;

    // If 401 Unauthorized, redirect to login
    if (status === 401) {
      localStorage.removeItem('auth_token');
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        window.location.href = '/login';
      }
    }

    // If 422 with JWT-specific error message, treat as auth failure
    // But only redirect if we actually had a token (avoid redirect loop on login)
    if (status === 422 && localStorage.getItem('auth_token')) {
      const errMsg = error.response?.data?.msg || '';
      if (errMsg.includes('token') || errMsg.includes('signature') || errMsg.includes('expired')) {
        localStorage.removeItem('auth_token');
        const path = window.location.pathname;
        if (!path.startsWith('/login') && !path.startsWith('/register')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject({ message, status });
  }
);

export default client;
