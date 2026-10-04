import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, StatusBar 
} from 'react-native';
import { api } from '../api/apiService';

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardSpacing = 12;
const cardWidth = (width - (cardSpacing * 3)) / numColumns;
const showcaseHeight = width * 1.15; // Tall cinematic ratio

export default function CatalogScreen({ navigation }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Carousel State
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef(null);

  useEffect(() => {
    const fetchTrending = async () => {
      const data = await api.getDiscover();
      setTrending(data);
      setLoading(false);
    };
    fetchTrending();
  }, []);

  // Auto-Sliding Logic for the Carousel
  useEffect(() => {
    if (trending.length === 0) return;
    const showcaseData = trending.slice(0, 5); // Top 5 for carousel
    
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= showcaseData.length) nextIndex = 0;
      
      carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 4000); // Slides every 4 seconds

    return () => clearInterval(interval);
  }, [currentIndex, trending]);

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar backgroundColor="#09090b" barStyle="light-content" />
        <Text style={styles.splashTitle}>VOID<Text style={styles.splashAccent}>ANIME</Text></Text>
        <ActivityIndicator size="large" color="#e21c48" style={{ marginTop: 20 }} />
      </View>
    );
  }

  const showcaseData = trending.slice(0, 5);
  const gridData = trending.slice(5); // The rest goes to the grid below

  // 1. The Auto-Sliding Showcase Component
  const renderShowcase = () => (
    <View style={styles.showcaseWrapper}>
      <FlatList
        ref={carouselRef}
        data={showcaseData}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `showcase-${item.id}`}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => navigation.navigate('Details', { animeId: item.id, title: item.title })}
          >
            <View style={styles.showcaseCard}>
              <Image source={{ uri: item.poster }} style={styles.showcaseImage} />
              <View style={styles.showcaseOverlay}>
                <Text style={styles.showcaseTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.showcaseMeta}>{item.meta}</Text>
                <View style={styles.playButton}>
                  <Text style={styles.playButtonText}>▶ WATCH NOW</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      {/* Carousel Pagination Dots */}
      <View style={styles.dotContainer}>
        {showcaseData.map((_, index) => (
          <View key={index} style={[styles.dot, currentIndex === index && styles.activeDot]} />
        ))}
      </View>
    </View>
  );

  // 2. The Standard Grid Cards
  const renderGridCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Details', { animeId: item.id, title: item.title })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.poster }} style={styles.poster} />
        {/* Badges floating over the image */}
        <View style={styles.badgeContainer}>
          {item.sub && <View style={styles.badge}><Text style={styles.badgeText}>SUB</Text></View>}
          {item.dub && <View style={[styles.badge, styles.dubBadge]}><Text style={styles.badgeText}>DUB</Text></View>}
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09090b" barStyle="light-content" translucent={false} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>VOID<Text style={{color: '#e21c48'}}>ANIME</Text></Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Main Scrolling View */}
      <FlatList
        data={gridData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGridCard}
        numColumns={numColumns}
        ListHeaderComponent={
          <>
            {renderShowcase()}
            <Text style={styles.sectionTitle}>Recommended For You</Text>
          </>
        }
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Base Palette
  container: { flex: 1, backgroundColor: '#09090b' },
  
  // Splash Screen
  splashContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
  splashTitle: { fontSize: 42, fontWeight: '900', color: '#ffffff', letterSpacing: 2 },
  splashAccent: { color: '#e21c48' },

  // Header
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#09090b' 
  },
  logoText: { fontSize: 22, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  searchIcon: { fontSize: 20 },

  // Showcase Carousel
  showcaseWrapper: { marginBottom: 24 },
  showcaseCard: { width: width, height: showcaseHeight },
  showcaseImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  showcaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.4)', // Dark gradient simulation
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 40,
  },
  showcaseTitle: { fontSize: 28, fontWeight: '900', color: '#ffffff', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 5 },
  showcaseMeta: { fontSize: 13, color: '#9aa0ae', marginBottom: 16, fontWeight: '600' },
  playButton: { backgroundColor: '#e21c48', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4, alignSelf: 'flex-start' },
  playButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  
  // Pagination Dots
  dotContainer: { flexDirection: 'row', position: 'absolute', bottom: 15, alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(154, 160, 174, 0.5)', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#e21c48', width: 24 }, // Extends the active dot like a pill

  // Grid Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', paddingHorizontal: 16, marginBottom: 16 },
  listContainer: { paddingBottom: 30 },
  row: { justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  
  // Grid Cards
  card: { width: cardWidth, borderRadius: 8, overflow: 'hidden', backgroundColor: '#141417' },
  imageContainer: { width: '100%', height: cardWidth * 1.4, position: 'relative' },
  poster: { width: '100%', height: '100%', resizeMode: 'cover' },
  badgeContainer: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', gap: 4 },
  badge: { backgroundColor: 'rgba(9, 9, 11, 0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#e21c48' },
  dubBadge: { borderColor: '#9aa0ae' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#ffffff' },
  cardContent: { padding: 8 },
  title: { fontSize: 13, fontWeight: '600', color: '#9aa0ae', height: 36, lineHeight: 18 }
});