import { useEffect } from 'react';
import { publicApi, secureApi } from '../utils/apiConfig';
import { useAuth } from '../context/AuthContext';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const useAxiosPublic = () => {
  return publicApi;
};

export const useAxiosSecure = () => {
  const { token, updateToken, logout } = useAuth();

  useEffect(() => {
    const requestIntercept = secureApi.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem('token') || token;
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = secureApi.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((newToken) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return secureApi(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const tokenToRefresh = localStorage.getItem('token') || token;
            if (!tokenToRefresh) {
              logout();
              return Promise.reject(error);
            }

            const response = await publicApi.post('/api/auth/refresh', { token: tokenToRefresh });
            if (response.data?.success) {
              const newToken = response.data.data.token;
              updateToken(newToken);
              processQueue(null, newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return secureApi(originalRequest);
            }
          } catch (refreshError) {
            processQueue(refreshError, null);
            // ONLY log out if backend explicitly rejected with 401 or 403 auth errors.
            // NEVER log out on network errors (e.g. offline mode)!
            if (refreshError.response && (refreshError.response.status === 401 || refreshError.response.status === 403)) {
              logout();
            }
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      secureApi.interceptors.request.eject(requestIntercept);
      secureApi.interceptors.response.eject(responseIntercept);
    };
  }, [token, updateToken, logout]);

  return secureApi;
};

