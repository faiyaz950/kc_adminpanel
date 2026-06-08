import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
const baseURL = String(rawBaseUrl).replace(/\/+$/, '');

export const API_BASE_URL = baseURL;

const client = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
  timeout: 120000,
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
    const config = err.config;
    const status = err.response?.status;

    if (status === 429 && config) {
      const attempt = config.__retry429Count || 0;
      if (attempt < 4) {
        config.__retry429Count = attempt + 1;
        const retryAfter = parseInt(
          err.response?.headers?.['retry-after'] || String(5 + attempt * 4),
          10,
        );
        await sleep(Math.min(Math.max(retryAfter, 4), 20) * 1000);
        return client(config);
      }
    }

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default client;
