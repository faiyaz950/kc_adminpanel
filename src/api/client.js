import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
const baseURL = String(rawBaseUrl).replace(/\/+$/, '');

export const API_BASE_URL = baseURL;

const client = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
  timeout: 30000,
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

client.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

client.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config || {};
    const status = err.response?.status;
    const method = (config.method || 'get').toLowerCase();

    if (
      status === 429 &&
      method === 'get' &&
      !config.skipRetry &&
      (config.__retry429Count || 0) < 1
    ) {
      config.__retry429Count = 1;
      await sleep(3000);
      return client(config);
    }

    if (
      status === 401 &&
      !config.url?.includes('/login') &&
      !window.location.pathname.includes('login')
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    return Promise.reject(err);
  }
);

export default client;
