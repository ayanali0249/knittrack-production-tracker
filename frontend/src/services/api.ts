import axios from 'axios';

// Default base URL uses the Vite proxy '/api' in dev, or VITE_API_URL if set in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized and not already on /login, redirect
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      // Don't auto-redirect if checking auth state
      if (!error.config.url?.includes('/auth/me')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
