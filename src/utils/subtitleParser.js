/**
 * Converts HH:MM:SS.mmm or MM:SS.mmm to seconds.
 */
export function timeToSeconds(timeStr) {
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

/**
 * Parses raw VTT text into structured cues with layout styles.
 */
export function parseVttToCues(vttText) {
  const cleanVtt = vttText.replace(/^\uFEFF/, '').trimStart().replace(/\r/g, '');
  const blocks = cleanVtt.split(/\n\s*\n/);
  const cues = [];

  blocks.forEach(block => {
    const lines = block.split('\n');
    const timeLineIndex = lines.findIndex(l => l.includes('-->'));
    if (timeLineIndex === -1) return;

    const timeLine = lines[timeLineIndex];
    const textLines = lines.slice(timeLineIndex + 1).join('\n');

    const match = timeLine.match(/([\d:,.]+)\s*-->\s*([\d:,.]+)\s*(.*)/);
    if (match) {
      const start = timeToSeconds(match[1]);
      const end = timeToSeconds(match[2]);
      const settingsStr = match[3] || '';

      let dynamicStyle = {
        bottom: '10%',
        left: '5%',
        right: '5%',
        alignItems: 'center',
        textAlign: 'center'
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

/**
 * Fetches and parses a remote VTT track.
 */
export async function fetchAndParseSubtitle(subUrl, spoofedHeaders) {
  const response = await fetch(subUrl, { headers: spoofedHeaders });
  const rawText = await response.text();
  return parseVttToCues(rawText);
}