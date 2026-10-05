import { apiClient } from './apiClient';
import { APP_CONFIG, ENDPOINTS } from '../config/env';

export const api = {
  getDiscover: async () => {
    try { return await apiClient.get(ENDPOINTS.discover()); } catch { return []; }
  },
  searchAnime: async (query) => {
    try { return await apiClient.get(ENDPOINTS.search(query)); } catch { return []; }
  },
  getEpisodes: async (id, source = APP_CONFIG.DEFAULT_SOURCE) => {
    try {
      const data = await apiClient.get(ENDPOINTS.episodes(id, source));
      if (data) {
        return Object.entries(data).map(([epKey, epDetails]) => {
            // Extract numbers from labels (e.g., "E12" -> 12)
            const parsedNumber = parseInt(epKey.replace(/\D/g, ''), 10) || 0;
            return {
                id: epDetails.id,
                label: epKey,
                number: parsedNumber,
                has_sub: epDetails.has_sub,
                has_dub: epDetails.has_dub
            };
        }).sort((a, b) => a.number - b.number); // Sort numerically ascending
      }
      return [];
    } catch { return []; }
  },
  getKey: async () => {
    try { return await apiClient.get(ENDPOINTS.key()); } catch (error) { throw error; }
  },
  getStream: async (episodeId, mode = APP_CONFIG.DEFAULT_STREAM_MODE, source = APP_CONFIG.DEFAULT_SOURCE) => {
    try { return await apiClient.get(ENDPOINTS.stream(episodeId, mode, source)); } catch (error) { throw error; }
  }
};