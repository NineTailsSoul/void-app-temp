import { APP_CONFIG } from '../config/env';

export const apiClient = {
  get: async (endpoint) => {
    try {
      // Automatically inject the developer bypass secret if it exists
      let finalEndpoint = endpoint;
      if (APP_CONFIG.DEV_SECRET) {
        const separator = endpoint.includes('?') ? '&' : '?';
        finalEndpoint = `${endpoint}${separator}secret=${APP_CONFIG.DEV_SECRET}`;
      }

      const response = await fetch(`${APP_CONFIG.API_BASE_URL}${finalEndpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`[API Client Error] Failed to fetch ${endpoint}:`, error);
      throw error;
    }
  }
};