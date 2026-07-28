import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401, then force logout + re-render via notifying the store
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh });
          const { access_token } = res.data;
          localStorage.setItem('access_token', access_token);
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        } catch {
          // Refresh also failed — clear auth and trigger a React re-render
          // by dispatching a storage event so the reactive store picks it up
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          // Dispatch storage event so useSyncExternalStore re-reads
          window.dispatchEvent(new Event('storage'));
          // Also hard-navigate as fallback after a tick
          setTimeout(() => { window.location.replace('/login'); }, 100);
        }
      } else {
        // No refresh token — clear and redirect
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage'));
        setTimeout(() => { window.location.replace('/login'); }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
