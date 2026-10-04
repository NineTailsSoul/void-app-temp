import { Buffer } from 'buffer';
import { api } from '../api/apiService';
import { APP_CONFIG, ENDPOINTS } from '../config/env';
import { decryptAESGCM } from './cryptoHelpers';

export const shieldExtractor = {
  fetchAndUnlockMainKey: async () => {
    try {
      const keyResponse = await api.getKey();
      const doubleEncryptedKey = keyResponse.encrypted_main_key;

      // Manually append the DEV_SECRET for the raw image fetch since it bypasses apiClient
      let shieldUrl = `${APP_CONFIG.API_BASE_URL}${ENDPOINTS.shield()}`;
      if (APP_CONFIG.DEV_SECRET) {
        shieldUrl += `?secret=${APP_CONFIG.DEV_SECRET}`;
      }

      const imageRes = await fetch(shieldUrl);
      if (!imageRes.ok) throw new Error("Failed to fetch shield image");
      
      const imageBuffer = await imageRes.arrayBuffer();
      const imageBytes = new Uint8Array(imageBuffer);

      const aes2KeyBytes = imageBytes.slice(-32);
      const aes2KeyBuffer = Buffer.from(aes2KeyBytes);

      return decryptAESGCM(aes2KeyBuffer, doubleEncryptedKey);
    } catch (error) {
      console.error("[Shield Extractor] Pipeline failed:", error);
      throw error;
    }
  }
};