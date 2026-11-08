import axios from 'axios';

// When running on localhost in a desktop browser, route to local backend (port 5000)
// so newly created features, admin endpoints, and local database models function during development.
// In native Android/iOS (Capacitor) or production web, use VITE_API_BASE_URL.
const isLocalBrowser = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  !window.Capacitor?.isNativePlatform();

export const API_BASE_URL = isLocalBrowser
  ? (import.meta.env.VITE_API_LOCAL_URL || 'http://localhost:5000')
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

export const getPublicWebUrl = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return import.meta.env.VITE_PUBLIC_WEB_URL || 'https://nexuswealthmanager.xyz';
  }
  return origin;
};

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const secureApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach authorization token to secureApi calls if token exists
secureApi.interceptors.request.use(
  (config) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
