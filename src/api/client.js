import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
const baseURL = String(rawBaseUrl).replace(/\/+$/, '');

export const API_BASE_URL = baseURL;

const client = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
  timeout: 30000,
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    // Large majlis audio (50MB+) needs more than the default 30s.
    config.timeout = 600000;
  }
  return config;
});

client.interceptors.response.use(
  res => res,
  err => {
    const config = err.config || {};
    const status = err.response?.status;

    if (
      status === 401 &&
      !config.url?.includes('/login') &&
      window.location.pathname !== '/'
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    return Promise.reject(err);
  }
);

export default client;
