// 🌍 YOUR SINGLE SOURCE OF TRUTH
// REPLACE 192.168.X.X WITH YOUR ACTUAL ARCH LINUX LAPTOP IP ADDRESS!
export const BACKEND_ROOT_URL = 'http://192.168.1.7:5000'; 
export const API_BASE_URL = `${BACKEND_ROOT_URL}/api`;

export const apiClient = {
  get: async (endpoint) => {
    try {
      // Removing Firebase AppCheck logic for now; relying on DEV_SECRET bypass
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[API Client Error] Failed to fetch ${endpoint}:`, error);
      throw error;
    }
  }
};