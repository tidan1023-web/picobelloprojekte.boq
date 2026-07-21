import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // generous — some requests carry photo uploads / PDF generation over slow connections
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      // Client-side navigation, not a hard redirect — a full page load to /login
      // depends on the host correctly serving index.html for every path, which
      // isn't guaranteed on every static-hosting setup. AuthContext listens for
      // this and calls the router's navigate() instead.
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(err);
  }
);

export default api;
