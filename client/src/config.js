// Backend location. In dev leave VITE_API_URL unset and Vite proxies /api and /ws
// to localhost:8000. In production (Vercel) set it to the Render backend URL,
// e.g. https://delligence-api.onrender.com
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const API_URL = `${API_ORIGIN}/api/v1`;

export const WS_URL = API_ORIGIN
  ? `${API_ORIGIN.replace(/^http/, 'ws')}/ws`
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
