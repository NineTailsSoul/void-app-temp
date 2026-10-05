import { Buffer } from 'buffer';
import { decryptAESGCM } from './cryptoHelpers';

function timeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  let seconds = 0;
  if (parts.length === 3) {
    seconds += parseFloat(parts[0]) * 3600; 
    seconds += parseFloat(parts[1]) * 60;   
    seconds += parseFloat(parts[2].replace(',', '.')); 
  } else if (parts.length === 2) {
    seconds += parseFloat(parts[0]) * 60;
    seconds += parseFloat(parts[1].replace(',', '.'));
  }
  return seconds;
}

function parseVttToJSON(vttText) {
  const cues = [];
  const blocks = vttText.replace(/\r/g, '').split(/\n\s*\n/);

  blocks.forEach(block => {
    const lines = block.split('\n');
    const timeLineIndex = lines.findIndex(l => l.includes('-->'));
    if (timeLineIndex === -1) return; 

    const timeLine = lines[timeLineIndex];
    const textLines = lines.slice(timeLineIndex + 1).join('\n');

    const timeRegex = /([\d:,.]+)\s*-->\s*([\d:,.]+)\s*(.*)/;
    const match = timeLine.match(timeRegex);

    if (match) {
      const start = timeToSeconds(match[1]);
      const end = timeToSeconds(match[2]);
      const settingsStr = match[3] || '';

      // FIX 1: Split Flexbox alignment (alignItems) and text alignment (textAlign)
      let dynamicStyle = { 
        bottom: '10%', 
        left: '5%', 
        right: '5%', 
        alignItems: 'center', // Centers the container
        textAlign: 'center'   // Centers the text inside the container
      };

      if (settingsStr.includes('line:')) {
        const lineMatch = settingsStr.match(/line:(\d+)%/);
        if (lineMatch) {
          dynamicStyle.bottom = undefined;
          dynamicStyle.top = `${lineMatch[1]}%`;
        }
      }
      
      if (settingsStr.includes('align:start') || settingsStr.includes('align:left')) {
        dynamicStyle.alignItems = 'flex-start';
        dynamicStyle.textAlign = 'left';
      } else if (settingsStr.includes('align:end') || settingsStr.includes('align:right')) {
        dynamicStyle.alignItems = 'flex-end';
        dynamicStyle.textAlign = 'right';
      }

      const cleanText = textLines.replace(/<[^>]+>/g, '').trim();

      if (cleanText) {
        cues.push({ start, end, text: cleanText, style: dynamicStyle });
      }
    }
  });

  return cues;
}

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
          const parsedCues = parseVttToJSON(vttText);

          subtitleTracks.push({
            label: sub.label || `Track ${i + 1}`,
            cues: parsedCues 
          });
        } catch (fetchErr) {
          console.error(`[Decryptor] Subtitle Fetch failed:`, fetchErr);
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