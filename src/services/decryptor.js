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
      for (const sub of streamData.encrypted_subtitles) {
        const decSubUrl = decryptAESGCM(keyBuffer, sub.file);
        subtitleTracks.push({
          label: sub.label,
          url: decSubUrl
        });
      }
    }

    // Notice we removed the CORS proxy wrapper!
    return {
      videoUrl: decryptedStreamUrl,
      subtitles: subtitleTracks
    };
  } catch (error) {
    console.error("[Decryptor] Stream decryption failed:", error);
    throw error;
  }
}