import { Buffer } from 'buffer';
import { decryptAESGCM } from './cryptoHelpers';

export async function processSecureStream(streamData, keyHex) {
  try {
    const keyBuffer = Buffer.from(keyHex, 'hex');

    // Decrypt HLS Master Manifest
    const decryptedStreamUrl = decryptAESGCM(keyBuffer, streamData.encrypted_stream);
    
    // Decrypt Subtitles
    const subtitleTracks = [];
    if (streamData.encrypted_subtitles) {
      // 1. Define the exact headers required to bypass the CDN blocks
      const spoofedHeaders = {
        'Origin': 'https://megaplay.buzz',
        'Referer': 'https://megaplay.buzz/',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
      };

      for (const sub of streamData.encrypted_subtitles) {
        const decSubUrl = decryptAESGCM(keyBuffer, sub.file);
        
        try {
          // 2. Intercept the URL, fetch the raw text with spoofed headers
          const response = await fetch(decSubUrl, { headers: spoofedHeaders });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const vttText = await response.text();
          
          // 3. Convert to Base64 using the existing Buffer import
          const base64 = Buffer.from(vttText).toString('base64');

          // 4. Push the valid Data URI instead of the raw CDN link
          subtitleTracks.push({
            label: sub.label,
            url: `data:text/vtt;charset=utf-8;base64,${base64}`
          });
        } catch (fetchErr) {
          console.warn(`Failed to fetch subtitle ${sub.label}:`, fetchErr);
        }
      }
    }

    return {
      videoUrl: decryptedStreamUrl,
      subtitles: subtitleTracks
    };
  } catch (error) {
    console.error("[Decryptor] Stream decryption failed:", error);
    throw error;
  }
}