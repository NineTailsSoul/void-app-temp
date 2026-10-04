export const APP_CONFIG = {
  // 🌍 NETWORK
  API_BASE_URL: 'http://192.168.1.7:5000/api', 
  
  // 🔒 SECURITY (Set to '' in production)
  DEV_SECRET: 'aryan',

  // ⚙️ STREAMING DEFAULTS
  DEFAULT_SOURCE: 'voidanime',
  DEFAULT_STREAM_MODE: 'sub'
};

export const ENDPOINTS = {
  discover: () => `/discover`,
  search: (query) => `/search?q=${encodeURIComponent(query)}`,
  episodes: (id, source) => `/episodes?id=${encodeURIComponent(id)}&source=${source}`,
  key: () => `/key`,
  stream: (id, mode, source) => `/stream?id=${encodeURIComponent(id)}&source=${source}&mode=${mode}`,
  shield: () => `/shield.png`
};