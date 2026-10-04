import { apiClient } from './apiClient';

const CONFIG = {
  defaultSource: 'voidanime',
  defaultStreamMode: 'sub'
};

// Developer Bypass Configuration
const DEV_SECRET = 'aryan';

const appendSecret = (url) => {
  if (!DEV_SECRET) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}secret=${DEV_SECRET}`;
};

export const api = {
  searchAnime: async (query) => {
    try {
      return await apiClient.get(appendSecret(`/search?q=${encodeURIComponent(query)}`));
    } catch {
      return [];
    }
  },

  getEpisodes: async (id, source = CONFIG.defaultSource) => {
    try {
      const data = await apiClient.get(appendSecret(`/episodes?id=${encodeURIComponent(id)}&source=${source}`));

      if (data) {
        return Object.entries(data).map(([epKey, epDetails]) => ({
            id: epDetails.id,
            label: epKey, // E1, E2, etc.
        }));
      }
      return [];
    } catch {
      return [];
    }
  }
};