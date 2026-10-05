import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  ActivityIndicator, Dimensions, StatusBar, ScrollView 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video, { TextTrackType } from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { api } from '../api/apiService';
import { shieldExtractor } from '../crypto/shieldExtractor';
import { processSecureStream } from '../crypto/decryptor';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = width * (9 / 16); 
const EPISODES_PER_PAGE = 50;

export default function PlayerScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  
  const { 
    episodeId: initialEpisodeId, animeId, title = 'Unknown Series',
    episodes = [], hasSub = true, hasDub = false, defaultMode = 'sub'
  } = route.params;

  const videoRef = useRef(null);
  
  const [currentEpisodeId, setCurrentEpisodeId] = useState(initialEpisodeId);
  const [mode, setMode] = useState(defaultMode);
  
  const [videoUrl, setVideoUrl] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [selectedSubIndex, setSelectedSubIndex] = useState(0); 

  const initialEpisodeIndex = episodes.findIndex(ep => String(ep.id) === String(initialEpisodeId));
  const initialChunk = initialEpisodeIndex !== -1 ? Math.floor(initialEpisodeIndex / EPISODES_PER_PAGE) : 0;
  const [activeChunk, setActiveChunk] = useState(initialChunk);

  const chunkedEpisodes = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < episodes.length; i += EPISODES_PER_PAGE) {
      chunks.push(episodes.slice(i, i + EPISODES_PER_PAGE));
    }
    return chunks;
  }, [episodes]);

  const currentEpisodesList = chunkedEpisodes[activeChunk] || [];

  useEffect(() => {
    let isMounted = true;
    const initializeStream = async () => {
      setLoading(true);
      setError(null);
      setVideoUrl(null);
      setSubtitles([]);
      setShowSettings(false);
      setSelectedQuality('auto');
      setSelectedSubIndex(0); // Default to first subtitle

      try {
        const [streamData, mainKeyHex] = await Promise.all([
          api.getStream(currentEpisodeId, mode),
          shieldExtractor.fetchAndUnlockMainKey()
        ]);

        if (!isMounted) return;
        if (!streamData || !mainKeyHex) throw new Error("Backend returned empty payload");

        const decryptedData = await processSecureStream(streamData, mainKeyHex);
        
        if (!isMounted) return;
        
        setVideoUrl(decryptedData.videoUrl);
        setSubtitles(decryptedData.subtitles || []);
      } catch (err) {
        if (isMounted) setError("Signal Interrupted: Stream offline or decryption failed.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeStream();
    return () => { isMounted = false; };
  }, [currentEpisodeId, mode]);

  // Map Data-URI subtitles. Memoized to prevent array re-renders breaking the native view.
  const textTracks = useMemo(() => {
    return subtitles.map((sub, index) => ({
      title: sub.label || `Track ${index + 1}`,
      language: sub.language || 'en',
      type: TextTrackType.VTT,
      uri: sub.dataUri || sub.url 
    }));
  }, [subtitles]);

  // Strictly parse heights as base-10 integers
  const handleVideoLoad = (data) => {
    if (data.videoTracks && data.videoTracks.length > 0) {
      const heights = [...new Set(data.videoTracks.map(t => parseInt(t.height, 10)))].filter(h => h > 0);
      setAvailableQualities(heights.sort((a, b) => b - a));
    }
  };

  const renderPagination = () => {
    if (chunkedEpisodes.length <= 1) return null;
    return (
      <View style={styles.paginationWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paginationScroll}>
          {chunkedEpisodes.map((_, index) => {
            const startEp = (index * EPISODES_PER_PAGE) + 1;
            const endEp = Math.min((index + 1) * EPISODES_PER_PAGE, episodes.length);
            const isActive = activeChunk === index;
            
            return (
              <TouchableOpacity
                key={index}
                style={[styles.pageTab, isActive && styles.pageTabActive]}
                onPress={() => setActiveChunk(index)}
              >
                <Text style={[styles.pageTabText, isActive && styles.pageTabTextActive]}>
                  {startEp} - {endEp}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderEpisodeItem = ({ item }) => {
    const isPlaying = String(item.id) === String(currentEpisodeId);
    return (
      <TouchableOpacity
        style={[styles.epRow, isPlaying && styles.epRowActive]}
        activeOpacity={0.7}
        onPress={() => {
          setCurrentEpisodeId(item.id);
          const newIndex = episodes.findIndex(ep => String(ep.id) === String(item.id));
          if (newIndex !== -1) setActiveChunk(Math.floor(newIndex / EPISODES_PER_PAGE));
        }}
      >
        <View style={styles.epInfo}>
          <Text style={[styles.epLabel, isPlaying && styles.epLabelActive]} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
        {isPlaying && (
          <View style={styles.playingIndicator}>
            <View style={styles.pulseDot} />
            <View style={styles.solidDot} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      <View style={{ height: insets.top + 48, backgroundColor: '#09090b' }} />

      <View style={styles.videoContainer}>
        {videoUrl ? (
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
            onLoad={handleVideoLoad}
            textTracks={textTracks}
            // FIXED: Using array 'index' type instead of 'title' for strict binding
            selectedTextTrack={{
              type: selectedSubIndex === -1 || textTracks.length === 0 ? "disabled" : "index",
              value: selectedSubIndex !== -1 && textTracks.length > 0 ? selectedSubIndex : undefined
            }}
            // FIXED: Force parsing to base-10 integer
            selectedVideoTrack={{
              type: selectedQuality === 'auto' ? 'auto' : 'resolution',
              value: selectedQuality === 'auto' ? undefined : parseInt(selectedQuality, 10)
            }}
            style={styles.videoPlayer}
            controls={true}
            resizeMode="contain"
            ignoreSilentSwitch="ignore"
            onError={() => setError('Media failed to initialize')}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#e21c48" />
                <Text style={styles.loadingText}>Decrypting Stream...</Text>
              </>
            ) : (
              <>
                <Icon name="warning-outline" size={32} color="#e21c48" />
                <Text style={styles.errorText}>{error}</Text>
              </>
            )}
          </View>
        )}

        {/* Custom Header Overlay */}
        {!showSettings && (
          <LinearGradient 
            colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.4)', 'transparent']} 
            style={styles.videoOverlay}
            pointerEvents="box-none"
          >
            <View style={styles.overlayHeader} pointerEvents="auto">
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Icon name="chevron-back" size={28} color="#ffffff" />
              </TouchableOpacity>
              
              <Text style={styles.overlayTitle} numberOfLines={1}>{title}</Text>
              
              <View style={styles.headerControls}>
                <View style={styles.modeToggleContainer}>
                  {hasSub && (
                    <TouchableOpacity onPress={() => setMode('sub')} style={[styles.modeBtn, mode === 'sub' && styles.modeBtnActive]}>
                      <Text style={[styles.modeText, mode === 'sub' && styles.modeTextActive]}>SUB</Text>
                    </TouchableOpacity>
                  )}
                  {hasDub && (
                    <TouchableOpacity onPress={() => setMode('dub')} style={[styles.modeBtn, mode === 'dub' && styles.modeBtnActive]}>
                      <Text style={[styles.modeText, mode === 'dub' && styles.modeTextActive]}>DUB</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {videoUrl && (
                  <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsIcon}>
                    <Icon name="options" size={24} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Settings Modal Overlay */}
        {showSettings && (
          <View style={styles.settingsOverlay}>
            <View style={styles.settingsPanel}>
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>Playback Settings</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeBtn}>
                  <Icon name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.settingsScroll}
                contentContainerStyle={styles.settingsScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.settingsSectionTitle}>Resolution</Text>
                <View style={styles.settingsOptionsRow}>
                  <TouchableOpacity 
                    style={[styles.settingsOption, selectedQuality === 'auto' && styles.settingsOptionActive]}
                    onPress={() => setSelectedQuality('auto')}
                  >
                    <Text style={[styles.settingsOptionText, selectedQuality === 'auto' && styles.settingsOptionTextActive]}>Auto</Text>
                  </TouchableOpacity>
                  {availableQualities.map(q => (
                    <TouchableOpacity 
                      key={`qual-${q}`}
                      style={[styles.settingsOption, selectedQuality === q && styles.settingsOptionActive]}
                      onPress={() => setSelectedQuality(q)}
                    >
                      <Text style={[styles.settingsOptionText, selectedQuality === q && styles.settingsOptionTextActive]}>{q}p</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {subtitles.length > 0 && (
                  <>
                    <Text style={[styles.settingsSectionTitle, { marginTop: 20 }]}>Subtitles</Text>
                    <View style={styles.settingsOptionsRow}>
                      <TouchableOpacity 
                        style={[styles.settingsOption, selectedSubIndex === -1 && styles.settingsOptionActive]}
                        onPress={() => setSelectedSubIndex(-1)}
                      >
                        <Text style={[styles.settingsOptionText, selectedSubIndex === -1 && styles.settingsOptionTextActive]}>Off</Text>
                      </TouchableOpacity>
                      {subtitles.map((sub, idx) => (
                        <TouchableOpacity 
                          key={`sub-${idx}`}
                          style={[styles.settingsOption, selectedSubIndex === idx && styles.settingsOptionActive]}
                          onPress={() => setSelectedSubIndex(idx)}
                        >
                          <Text style={[styles.settingsOptionText, selectedSubIndex === idx && styles.settingsOptionTextActive]}>
                            {sub.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      <View style={styles.episodesSection}>
        <View style={styles.episodesHeader}>
          <Text style={styles.episodesTitle}>EPISODES</Text>
          <Text style={styles.episodesCount}>{episodes.length} Available</Text>
        </View>
        
        {renderPagination()}
        
        <FlatList
          data={currentEpisodesList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEpisodeItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  
  videoContainer: { width: '100%', height: VIDEO_HEIGHT, backgroundColor: '#000000', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10 },
  videoPlayer: { width: '100%', height: '100%' },
  videoPlaceholder: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
  loadingText: { color: '#e21c48', fontSize: 11, fontWeight: '800', marginTop: 16, textTransform: 'uppercase', letterSpacing: 1.5 },
  errorText: { color: '#9aa0ae', fontSize: 13, marginTop: 12, textAlign: 'center' },

  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, zIndex: 20 },
  overlayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 16 },
  backBtn: { padding: 4 },
  overlayTitle: { flex: 1, color: '#ffffff', fontSize: 15, fontWeight: '800', marginLeft: 8, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  
  headerControls: { flexDirection: 'row', alignItems: 'center' },
  modeToggleContainer: { flexDirection: 'row', backgroundColor: '#141417', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 12, overflow: 'hidden' },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  modeBtnActive: { backgroundColor: '#e21c48' },
  modeText: { color: '#9aa0ae', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  modeTextActive: { color: '#ffffff' },
  settingsIcon: { padding: 4 },

  settingsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 30, justifyContent: 'center', alignItems: 'center' },
  settingsPanel: { width: '90%', maxHeight: '85%', backgroundColor: '#141417', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 20 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  settingsTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  closeBtn: { padding: 4 },
  settingsScroll: { flexShrink: 1 },
  settingsScrollContent: { padding: 16, paddingBottom: 24 },
  settingsSectionTitle: { color: '#9aa0ae', fontSize: 11, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 },
  settingsOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  settingsOption: { backgroundColor: '#09090b', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  settingsOptionActive: { backgroundColor: 'rgba(226, 28, 72, 0.1)', borderColor: '#e21c48' },
  settingsOptionText: { color: '#9aa0ae', fontSize: 12, fontWeight: '700' },
  settingsOptionTextActive: { color: '#e21c48' },

  episodesSection: { flex: 1, backgroundColor: '#09090b', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  episodesHeader: { padding: 16, backgroundColor: '#09090b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  episodesTitle: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  episodesCount: { color: '#9aa0ae', fontSize: 12, marginTop: 4, fontWeight: '600' },
  
  paginationWrapper: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  paginationScroll: { paddingHorizontal: 16, gap: 8 },
  pageTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#141417', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  pageTabActive: { backgroundColor: 'rgba(226, 28, 72, 0.1)', borderColor: '#e21c48' },
  pageTabText: { color: '#9aa0ae', fontSize: 12, fontWeight: '800' },
  pageTabTextActive: { color: '#e21c48' },
  
  listContainer: { padding: 16, paddingBottom: 32 },
  epRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 8, backgroundColor: '#141417', borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  epRowActive: { backgroundColor: 'rgba(226, 28, 72, 0.08)', borderColor: 'rgba(226, 28, 72, 0.4)' },
  epInfo: { flex: 1, paddingRight: 16 },
  epLabel: { color: '#9aa0ae', fontSize: 14, fontWeight: '700' },
  epLabelActive: { color: '#ffffff' },

  playingIndicator: { width: 14, height: 14, justifyContent: 'center', alignItems: 'center' },
  pulseDot: { position: 'absolute', width: '100%', height: '100%', borderRadius: 7, backgroundColor: '#e21c48', opacity: 0.3 },
  solidDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e21c48' }
});