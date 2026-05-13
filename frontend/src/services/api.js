import axios from 'axios';

const normalizeApiBaseUrl = (rawUrl) => {
  const baseUrl = (rawUrl || 'http://localhost:3001').replace(/\/+$/, '');
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

/**
 * Static files (e.g. /uploads) are served at the API host root, not under /api.
 */
export const getPublicOrigin = () => {
  return API_BASE_URL.replace(/\/api\/?$/i, '');
};

export const resolveMediaUrl = (url) => {
  if (url == null) return '';
  const s = String(url).trim();
  if (s === '') return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return `${getPublicOrigin()}${s}`;
  return s;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers;
    if (h && typeof h.delete === 'function') {
      h.delete('Content-Type');
    } else if (h && typeof h === 'object') {
      delete h['Content-Type'];
      delete h['content-type'];
    }
  }
  return config;
});

export default apiClient;
