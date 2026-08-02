import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
// export const API_BASE_URL = import.meta.env.VITE_API_LOCAL_URL

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const secureApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
