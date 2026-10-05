import { Buffer } from 'buffer';
import RNFS from 'react-native-fs';
import { decryptAESGCM } from './cryptoHelpers';

export async function processSecureStream(streamData, keyHex) {
  try {
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const decryptedStreamUrl = decryptAESGCM(keyBuffer, streamData.encrypted_stream);
    
    const subtitleTracks = [];
    if (streamData.encrypted_subtitles) {
      const spoofedHeaders = {
        'Origin': 'https://megaplay.buzz',
        'Referer': 'https://megaplay.buzz/',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
      };

      for (let i = 0; i < streamData.encrypted_subtitles.length; i++) {
        const sub = streamData.encrypted_subtitles[i];
        const decSubUrl = decryptAESGCM(keyBuffer, sub.file);
        
        try {
          const response = await fetch(decSubUrl, { headers: spoofedHeaders });
          let vttText = await response.text();

          vttText = vttText.replace(/^\uFEFF/, '').trimStart();
          
          // FIX: Strip the invisible character/space before WEBVTT
          vttText = vttText.trimStart();
          
          // 1. SANITIZE: Strip hidden Windows carriage returns that corrupt timestamps
          vttText = vttText.replace(/\r/g, '');
          
          // 2. PARSE: Fix both sides of the '-->' securely
          vttText = vttText.split('\n').map(line => {
            if (line.includes('-->')) {
              return line.split('-->').map(part => {
                let t = part.trim();
                // If it's missing the hour prefix (MM:SS.mmm), safely prepend '00:'
                if (t.split(':').length === 2) {
                  return '00:' + t;
                }
                return t;
              }).join(' --> ');
            }
            return line;
          }).join('\n');

          const localPath = `${RNFS.CachesDirectoryPath}/sub_${Date.now()}_${i}.vtt`;
          await RNFS.writeFile(localPath, vttText, 'utf8');

          subtitleTracks.push({
            label: sub.label || '', 
            url: `file://${localPath}`,
            originalUrl: decSubUrl // We pass this to extract the language in the UI
          });
        } catch (fetchErr) {
          console.error(`[Decryptor] Fetch failed:`, fetchErr);
        }
      }
    }

    return {
      videoUrl: decryptedStreamUrl,
      subtitles: subtitleTracks
    };
  } catch (error) {
    console.error("[Decryptor] Decryption failed:", error);
    throw error;
  }
}