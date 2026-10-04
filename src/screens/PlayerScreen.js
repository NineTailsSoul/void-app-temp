import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import Video from 'react-native-video';
import { api } from '../api/apiService';
import { shieldExtractor } from '../services/shieldExtractor';
import { processSecureStream } from '../services/decryptor';

export default function PlayerScreen({ route }) {
  const { episodeId } = route.params;
  const videoRef = useRef(null);
  
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeStream = async () => {
      try {
        // 1. Fetch encrypted stream payload
        const streamData = await api.getStream(episodeId);
        
        // 2. Run the Shield Extractor pipeline
        const mainKeyHex = await shieldExtractor.fetchAndUnlockMainKey();
        
        // 3. Decrypt the payload natively
        const decryptedData = await processSecureStream(streamData, mainKeyHex);
        
        setVideoUrl(decryptedData.videoUrl);
      } catch (err) {
        console.error(err);
        setError('Failed to decrypt stream');
      } finally {
        setLoading(false);
      }
    };

    initializeStream();
  }, [episodeId]);

  if (error) return <View style={styles.container}><Text style={styles.errorText}>{error}</Text></View>;
  if (loading || !videoUrl) return <ActivityIndicator size="large" color="#10b981" style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{
          uri: videoUrl,
          headers: {
            'Origin': 'https://megaplay.buzz',
            'Referer': 'https://megaplay.buzz/',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
          }
        }}
        style={styles.videoPlayer}
        controls={true}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  videoPlayer: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  errorText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' }
});