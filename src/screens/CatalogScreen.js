import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, StatusBar 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/apiService';

const { width, height } = Dimensions.get('window');
const numColumns = 2; // Back to 2 columns for larger posters
const cardSpacing = 16;
const cardWidth = (width - (cardSpacing * 3)) / numColumns; 
const heroHeight = height * 0.45; 

export default function CatalogScreen({ navigation }) {
  const insets = useSafeAreaInsets(); // Calculates your phone's top status bar/notch height
  
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(20);
  const carouselRef = useRef(null);

  useEffect(() => {
    const fetchTrending = async () => {
      const data = await api.getDiscover();
      setTrending(data);
      setLoading(false);
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    if (trending.length === 0) return;
    const showcaseData = trending.slice(0, 5);
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= showcaseData.length) nextIndex = 0;
      carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 5000);
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
  const gridData = trending.slice(5, 5 + visibleCount); 
  const hasMore = (5 + visibleCount) < trending.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 20);
  };

  const renderHeroShowcase = () => (
    <View style={styles.heroWrapper}>
      <FlatList
        ref={carouselRef}
        data={showcaseData}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `hero-${item.id}`}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
        renderItem={({ item }) => (
          <View style={styles.heroSlide}>
            <Image 
              source={{ uri: item.poster }} 
              style={styles.heroBg} 
              blurRadius={15} 
            />
            <LinearGradient 
              colors={['transparent', 'rgba(9,9,11,0.8)', '#09090b']} 
              style={styles.heroGradient} 
            />
            
            {/* Centered Content */}
            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroRank}>#{currentIndex + 1} TRENDING</Text>
                <Text style={styles.heroTitle} numberOfLines={3}>{item.title}</Text>
                
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Details', { animeId: item.id, title: item.title })}
                >
                  <LinearGradient 
                    colors={['#e21c48', '#b91338']} 
                    style={styles.playButton}
                  >
                    <Icon name="play" size={18} color="#ffffff" style={{marginRight: 6}} />
                    <Text style={styles.playButtonText}>PLAY SERIES</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Details', { animeId: item.id, title: item.title })}
                style={styles.heroRight}
              >
                <Image source={{ uri: item.poster }} style={styles.heroPoster} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.dotContainer}>
        {showcaseData.map((_, index) => (
          <View key={index} style={[styles.dot, currentIndex === index && styles.activeDot]} />
        ))}
      </View>
    </View>
  );

  const renderGridCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.6} 
      onPress={() => navigation.navigate('Details', { animeId: item.id, title: item.title })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.poster }} style={styles.poster} />
        <View style={styles.badgeContainer}>
          {item.sub && <View style={styles.badge}><Text style={styles.badgeText}>SUB</Text></View>}
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {hasMore ? (
        <TouchableOpacity 
          style={styles.loadMoreBtn} 
          activeOpacity={0.7} 
          onPress={handleLoadMore}
        >
          <Text style={styles.loadMoreText}>LOAD MORE</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.endText}>You've reached the end of the void.</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09090b" barStyle="light-content" translucent={true} />
      
      {/* Dynamic Header spacing based on phone notch/status bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.logoText}>VOID<Text style={{color: '#e21c48'}}>ANIME</Text></Text>
      </View>

      <FlatList
        data={gridData}
        keyExtractor={(item, index) => `grid-${item.id}-${index}`}
        renderItem={renderGridCard}
        numColumns={numColumns}
        ListHeaderComponent={
          <>
            {renderHeroShowcase()}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended For You</Text>
            </View>
          </>
        }
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  splashContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
  splashTitle: { fontSize: 42, fontWeight: '900', color: '#ffffff', letterSpacing: 2 },
  splashAccent: { color: '#e21c48' },
  
  header: { 
    paddingHorizontal: 16, 
    paddingBottom: 16, 
    backgroundColor: '#09090b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  logoText: { fontSize: 24, fontWeight: '900', color: '#ffffff', letterSpacing: 2 },
  
  heroWrapper: { width: width, height: heroHeight, marginBottom: 24 },
  heroSlide: { width: width, height: heroHeight, position: 'relative' },
  heroBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.5 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  
  // Centered Hero Content
  heroContent: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20, 
    paddingBottom: 20 
  },
  
  heroLeft: { flex: 1, paddingRight: 20, justifyContent: 'center' },
  heroRank: { color: '#e21c48', fontWeight: '900', fontSize: 12, letterSpacing: 2, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#ffffff', marginBottom: 16, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 5 },
  playButton: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, alignSelf: 'flex-start', alignItems: 'center', elevation: 10, shadowColor: '#e21c48', shadowOpacity: 0.5, shadowRadius: 10 },
  playButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  
  heroRight: { width: 140, height: 200, borderRadius: 8, elevation: 15, shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 10 },
  heroPoster: { width: '100%', height: '100%', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  
  dotContainer: { flexDirection: 'row', position: 'absolute', bottom: 16, alignSelf: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(154, 160, 174, 0.4)', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#e21c48', width: 20 },

  sectionHeader: { paddingHorizontal: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#e21c48' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 8 },
  
  listContainer: { paddingBottom: 20 },
  row: { justifyContent: 'space-between', paddingHorizontal: cardSpacing, marginBottom: cardSpacing },
  
  card: { 
    width: cardWidth, 
    backgroundColor: '#141417', 
    borderRadius: 8, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: 'rgba(154, 160, 174, 0.15)', 
  },
  imageContainer: { width: '100%', height: cardWidth * 1.45, position: 'relative' },
  poster: { width: '100%', height: '100%', resizeMode: 'cover' },
  badgeContainer: { position: 'absolute', bottom: 6, left: 6 },
  badge: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#e21c48' },
  badgeText: { fontSize: 9, fontWeight: '900', color: '#ffffff' },
  
  cardContent: { padding: 10, height: 60, justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '700', color: '#9aa0ae', lineHeight: 18 },

  footerContainer: { paddingVertical: 30, alignItems: 'center' },
  loadMoreBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(226, 28, 72, 0.5)' },
  loadMoreText: { color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  endText: { color: '#9aa0ae', fontSize: 12, fontWeight: '600' }
});