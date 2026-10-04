import { apiClient } from './apiClient';

const CONFIG = { defaultSource: 'voidanime', defaultStreamMode: 'sub' };
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
    } catch { return []; }
  },

  getEpisodes: async (id, source = CONFIG.defaultSource) => {
    try {
      const data = await apiClient.get(appendSecret(`/episodes?id=${encodeURIComponent(id)}&source=${source}`));
      if (data) {
        return Object.entries(data).map(([epKey, epDetails]) => ({
            id: epDetails.id,
            label: epKey, 
        }));
      }
      return [];
    } catch { return []; }
  },

  // ADDED: Fetch the encrypted key
  getKey: async () => {
    try {
      return await apiClient.get(appendSecret('/key'));
    } catch (error) { throw error; }
  },

  // ADDED: Fetch the encrypted stream data
  getStream: async (episodeId, mode = CONFIG.defaultStreamMode, source = CONFIG.defaultSource) => {
    try {
      return await apiClient.get(appendSecret(`/stream?id=${encodeURIComponent(episodeId)}&source=${source}&mode=${mode}`));
    } catch (error) { throw error; }
  }
};