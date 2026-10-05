import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  ActivityIndicator, Dimensions, StatusBar, ScrollView, TouchableWithoutFeedback 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Slider from '@react-native-community/slider';

import { api } from '../api/apiService';
import { shieldExtractor } from '../crypto/shieldExtractor';
// Import from our new modular structure
import { decryptStreamPayload } from '../crypto/decryptor';
import { fetchAndParseSubtitle } from '../utils/subtitleParser';

const initialWindow = Dimensions.get('window');
const VIDEO_HEIGHT = initialWindow.width * (9 / 16); 
const EPISODES_PER_PAGE = 50;

// Helper to format MM:SS
const formatTime = (seconds) => {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function PlayerScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const videoRef = useRef(null);
  
  const { 
    episodeId: initialEpisodeId, animeId, title = 'Unknown Series',
    episodes = [], hasSub = true, hasDub = false, defaultMode = 'sub'
  } = route.params;

  // App State
  const [currentEpisodeId, setCurrentEpisodeId] = useState(initialEpisodeId);
  const [mode, setMode] = useState(defaultMode);
  const [videoUrl, setVideoUrl] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSubIndex, setSelectedSubIndex] = useState(0); 

  // Player State
  const [paused, setPaused] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false); // Prevents slider glitching while dragging
  
  // Custom Controls UI State
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowDims, setWindowDims] = useState(Dimensions.get('window'));
  
  const controlsTimeoutRef = useRef(null);
  const lastTapRef = useRef({ time: 0, side: null });

  const isLandscape = windowDims.width > windowDims.height;
  const renderFullscreen = isFullscreen || isLandscape;

  // Pagination Logic
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

  // Listen to screen rotations
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => setWindowDims(window));
    return () => subscription?.remove();
  }, []);

  // Initialize Stream & Subtitles
  useEffect(() => {
    let isMounted = true;
    const initializeStream = async () => {
      setLoading(true);
      setError(null);
      setVideoUrl(null);
      setSubtitles([]);
      setVideoTime(0);
      setPaused(false);
      triggerControlsHide();

      try {
        const [streamData, mainKeyHex] = await Promise.all([
          api.getStream(currentEpisodeId, mode),
          shieldExtractor.fetchAndUnlockMainKey()
        ]);

        if (!isMounted) return;
        if (!streamData || !mainKeyHex) throw new Error("Backend returned empty payload");

        const decryptedPayload = decryptStreamPayload(streamData, mainKeyHex);
        
        if (!isMounted) return;
        setVideoUrl(decryptedPayload.videoUrl);

        // Fetch and parse subtitles securely
        if (decryptedPayload.subtitles && decryptedPayload.subtitles.length > 0) {
          const spoofedHeaders = {
            'Origin': 'https://megaplay.buzz',
            'Referer': 'https://megaplay.buzz/',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          };
          
          const parsedTracks = await Promise.all(
            decryptedPayload.subtitles.map(async (sub, idx) => {
              try {
                const cues = await fetchAndParseSubtitle(sub.url, spoofedHeaders);
                return { label: sub.label, cues };
              } catch (err) {
                return null;
              }
            })
          );
          
          if (isMounted) {
            setSubtitles(parsedTracks.filter(t => t !== null));
          }
        }
      } catch (err) {
        if (isMounted) setError("Signal Interrupted: Stream offline or decryption failed.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeStream();
    return () => { isMounted = false; };
  }, [currentEpisodeId, mode]);

  // UI Control Timer Management
  const triggerControlsHide = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setShowControls(false);
    }, 4000); // 4 second auto-hide
  }, []);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    triggerControlsHide();
    return () => {
      isMountedRef.current = false;
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [triggerControlsHide]);

  // Double Tap & Single Tap Logic
  const handleVideoTap = (side) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // milliseconds

    if (now - lastTapRef.current.time < DOUBLE_TAP_DELAY && lastTapRef.current.side === side) {
      // It's a Double Tap!
      const jump = side === 'left' ? -10 : 10;
      const newTime = Math.max(0, Math.min(videoTime + jump, duration));
      if (videoRef.current) videoRef.current.seek(newTime);
      setVideoTime(newTime);
      triggerControlsHide(); // keep controls visible while skipping
      
      // Reset ref so triple-tap doesn't trigger two skips
      lastTapRef.current = { time: 0, side: null }; 
    } else {
      // It's a Single Tap
      lastTapRef.current = { time: now, side };
      if (showControls) {
        setShowControls(false); // Hide immediately if visible
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      } else {
        triggerControlsHide(); // Show and start timeout
      }
    }
  };

  const togglePlayPause = () => {
    setPaused(!paused);
    triggerControlsHide();
  };

  const handleVideoLoad = (data) => {
    setDuration(data.duration);
  };

  // Get active subtitle cue
  const activeCues = useMemo(() => {
    if (selectedSubIndex === -1 || !subtitles[selectedSubIndex]) return [];
    const cues = subtitles[selectedSubIndex].cues;
    return cues.filter(cue => videoTime >= cue.start && videoTime <= cue.end);
  }, [videoTime, selectedSubIndex, subtitles]);

  // Component Renderers
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
      <StatusBar hidden={renderFullscreen} barStyle="light-content" backgroundColor="transparent" translucent={true} />
      {!renderFullscreen && <View style={{ height: insets.top + 48, backgroundColor: '#09090b' }} />}

      <View style={renderFullscreen ? styles.videoContainerFullscreen : styles.videoContainer}>
        {videoUrl ? (
          <>
            <Video
              ref={videoRef}
              source={{
                uri: videoUrl,
                headers: {
                  'Origin': 'https://megaplay.buzz',
                  'Referer': 'https://megaplay.buzz/',
                  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
                }
              }}
              paused={paused}
              onLoad={handleVideoLoad}
              onProgress={({ currentTime }) => {
                if (!isSeeking) setVideoTime(currentTime);
              }}
              style={styles.videoPlayer}
              controls={false} // Native controls permanently destroyed
              resizeMode="contain"
              ignoreSilentSwitch="ignore"
              onError={() => setError('Media failed to initialize')}
            />

            {/* Custom Subtitles Overlay */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {activeCues.map((cue, idx) => {
                const { textAlign, ...viewStyles } = cue.style;
                return (
                  <View key={idx} style={[styles.subtitleCuesContainer, viewStyles]}>
                    <Text style={[styles.subtitleText, { textAlign: textAlign || 'center' }]}>
                      {cue.text}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Invisible Double/Single Tap Zones */}
            <View style={styles.touchZonesContainer}>
              <TouchableWithoutFeedback onPress={() => handleVideoTap('left')}>
                <View style={styles.touchZone} />
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback onPress={() => handleVideoTap('right')}>
                <View style={styles.touchZone} />
              </TouchableWithoutFeedback>
            </View>

            {/* Custom Controls Overlay */}
            {showControls && !showSettings && (
              <View style={styles.controlsWrapper} pointerEvents="box-none">
                
                {/* Top Header */}
                <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.overlayHeaderGradient}>
                  <View style={styles.overlayHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                      <Icon name="chevron-back" size={28} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.overlayTitle} numberOfLines={1}>{title}</Text>
                    
                    <View style={styles.headerControlsRight}>
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
                      <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerBtn}>
                        <Icon name="options" size={24} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>

                {/* Bottom Control Bar */}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomControlsGradient}>
                  <View style={styles.bottomControlsRow}>
                    
                    <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
                      <Icon name={paused ? "play" : "pause"} size={26} color="#ffffff" />
                    </TouchableOpacity>

                    <Text style={styles.timeText}>{formatTime(videoTime)}</Text>
                    
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={duration || 1}
                      value={videoTime}
                      minimumTrackTintColor="#e21c48"
                      maximumTrackTintColor="rgba(255,255,255,0.2)"
                      thumbTintColor="#e21c48"
                      onSlidingStart={() => {
                        setIsSeeking(true);
                        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                      }}
                      onValueChange={(val) => setVideoTime(val)}
                      onSlidingComplete={(val) => {
                        if (videoRef.current) videoRef.current.seek(val);
                        setIsSeeking(false);
                        triggerControlsHide();
                      }}
                    />

                    <Text style={styles.timeText}>{formatTime(duration)}</Text>

                    <TouchableOpacity onPress={() => setIsFullscreen(!isFullscreen)} style={styles.fullscreenBtn}>
                      <Icon name={renderFullscreen ? "contract" : "expand"} size={22} color="#ffffff" />
                    </TouchableOpacity>
                    
                  </View>
                </LinearGradient>

              </View>
            )}
          </>
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

        {/* Modal Overlay for Stream Settings */}
        {showSettings && (
          <View style={styles.settingsOverlay}>
            <View style={styles.settingsPanel}>
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>Playback Settings</Text>
                <TouchableOpacity onPress={() => { setShowSettings(false); triggerControlsHide(); }} style={styles.headerBtn}>
                  <Icon name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.settingsScroll} contentContainerStyle={styles.settingsScrollContent} showsVerticalScrollIndicator={false}>
                {subtitles.length > 0 && (
                  <>
                    <Text style={styles.settingsSectionTitle}>Subtitles</Text>
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

      {/* Episodes Section - Hidden in fullscreen mode */}
      {!renderFullscreen && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  
  videoContainer: { width: '100%', height: VIDEO_HEIGHT, backgroundColor: '#000000', zIndex: 10, elevation: 10 },
  videoContainerFullscreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', backgroundColor: '#000000', zIndex: 9999 },
  videoPlayer: { width: '100%', height: '100%' },
  
  // Custom Controls Layering
  touchZonesContainer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 20 },
  touchZone: { flex: 1 },
  
  controlsWrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', zIndex: 25 },
  overlayHeaderGradient: { height: 80, paddingHorizontal: 12, paddingTop: 16 },
  bottomControlsGradient: { height: 80, justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12 },
  
  bottomControlsRow: { flexDirection: 'row', alignItems: 'center' },
  playBtn: { padding: 4, marginRight: 8 },
  timeText: { color: '#ffffff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], width: 42, textAlign: 'center' },
  slider: { flex: 1, height: 40, marginHorizontal: 8 },
  fullscreenBtn: { padding: 4, marginLeft: 8 },

  subtitleCuesContainer: { position: 'absolute', zIndex: 15 },
  subtitleText: { color: '#ffffff', fontSize: 18, fontWeight: '800', textShadowColor: '#000000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4, paddingHorizontal: 4, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4 },

  videoPlaceholder: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
  loadingText: { color: '#e21c48', fontSize: 11, fontWeight: '800', marginTop: 16, textTransform: 'uppercase', letterSpacing: 1.5 },
  errorText: { color: '#9aa0ae', fontSize: 13, marginTop: 12, textAlign: 'center' },

  overlayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { padding: 4 },
  overlayTitle: { flex: 1, color: '#ffffff', fontSize: 15, fontWeight: '800', marginLeft: 8, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  
  headerControlsRight: { flexDirection: 'row', alignItems: 'center' },
  modeToggleContainer: { flexDirection: 'row', backgroundColor: '#141417', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 12, overflow: 'hidden' },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  modeBtnActive: { backgroundColor: '#e21c48' },
  modeText: { color: '#9aa0ae', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  modeTextActive: { color: '#ffffff' },

  settingsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 30, justifyContent: 'center', alignItems: 'center' },
  settingsPanel: { width: '90%', maxHeight: '85%', backgroundColor: '#141417', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 20 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  settingsTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
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