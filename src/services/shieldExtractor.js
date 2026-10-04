import { Buffer } from 'buffer';
import { api } from '../api/apiService';
import { API_BASE_URL } from '../api/apiClient';
import { decryptAESGCM } from './cryptoHelpers';

export const shieldExtractor = {
  fetchAndUnlockMainKey: async () => {
    try {
      // 1. Fetch double-encrypted key
      const keyResponse = await api.getKey();
      const doubleEncryptedKey = keyResponse.encrypted_main_key;

      // 2. Fetch the PNG image as raw binary data
      const imageRes = await fetch(`${API_BASE_URL}/shield.png`);
      if (!imageRes.ok) throw new Error("Failed to fetch shield image");
      
      const imageBuffer = await imageRes.arrayBuffer();
      const imageBytes = new Uint8Array(imageBuffer);

      // 3. Slice the last 32 bytes (The hidden AES2 Master Key)
      const aes2KeyBytes = imageBytes.slice(-32);
      const aes2KeyBuffer = Buffer.from(aes2KeyBytes);

      // 4. Decrypt and return the main stream key (as hex)
      const decryptedMainKeyStr = decryptAESGCM(aes2KeyBuffer, doubleEncryptedKey);
      return decryptedMainKeyStr;
      
    } catch (error) {
      console.error("[Shield Extractor] Pipeline failed:", error);
      throw error;
    }
  }
};