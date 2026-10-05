import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, StatusBar, Platform, ScrollView
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/apiService';

const { width, height } = Dimensions.get('window');
const heroHeight = height * 0.40;
const EPISODES_PER_PAGE = 50;

export default function DetailsScreen({ route, navigation }) {
  const { animeId, title, poster = 'https://via.placeholder.com/300x450' } = route.params;
  
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChunk, setActiveChunk] = useState(0);

  useEffect(() => {
    const fetchEps = async () => {
      const data = await api.getEpisodes(animeId);
      setEpisodes(data || []);
      setLoading(false);
    };
    fetchEps();
  }, [animeId]);

  // Divide episodes into chunks of 50
  const chunkedEpisodes = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < episodes.length; i += EPISODES_PER_PAGE) {
      chunks.push(episodes.slice(i, i + EPISODES_PER_PAGE));
    }
    return chunks;
  }, [episodes]);

  const currentEpisodes = chunkedEpisodes[activeChunk] || [];

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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.heroWrapper}>
        <Image source={{ uri: poster }} style={styles.heroBg} blurRadius={20} />
        <LinearGradient colors={['transparent', 'rgba(9,9,11,0.9)', '#09090b']} style={styles.heroGradient} />
        
        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <Image source={{ uri: poster }} style={styles.heroPoster} />
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroTitle} numberOfLines={4}>{title}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {loading ? 'LOADING...' : `${episodes.length} EPISODES`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Episodes</Text>
      </View>
      {renderPagination()}
    </View>
  );

  const renderEpisodeBtn = ({ item }) => {
    const isSub = item.has_sub ?? true;
    const isDub = item.has_dub ?? false;

    return (
      <TouchableOpacity 
        style={styles.epCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Player', { 
          // We are now passing ALL the necessary metadata to the Player
          episodeId: item.id,
          animeId: animeId,
          title: title,
          episodes: episodes, // Passes the full list of episodes for the bottom scroll view
          hasSub: isSub,
          hasDub: isDub,
          defaultMode: isSub ? 'sub' : 'dub'
        })}
      >
        <Text style={styles.epLabel} numberOfLines={1}>{item.label}</Text>
        <View style={styles.epBadges}>
          {isSub && <Text style={styles.subText}>SUB</Text>}
          {isSub && isDub && <Text style={styles.dividerText}>|</Text>}
          {isDub && <Text style={styles.dubText}>DUB</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" translucent={true} />
      
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="chevron-back" size={28} color="#ffffff" />
      </TouchableOpacity>

      {loading && episodes.length === 0 ? (
        <View style={[styles.container, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#e21c48" />
        </View>
      ) : (
        <FlatList
          data={currentEpisodes}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderHeader}
          renderItem={renderEpisodeBtn}
          numColumns={4}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No episodes found for this series.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  backButton: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 50, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(9,9,11,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  heroWrapper: { width: width, height: heroHeight, position: 'relative', marginBottom: 24 },
  heroBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.5 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  
  heroContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 20 },
  heroLeft: { width: 110, height: 160, borderRadius: 8, elevation: 15, shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 10, marginRight: 16 },
  heroPoster: { width: '100%', height: '100%', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroRight: { flex: 1, paddingBottom: 8 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 12, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 5 },
  badgeRow: { flexDirection: 'row' },
  countBadge: { backgroundColor: '#e21c48', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, shadowColor: '#e21c48', shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  countBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  sectionHeader: { paddingHorizontal: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#e21c48' },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', letterSpacing: 1, marginLeft: 8 },
  
  paginationWrapper: { paddingBottom: 16 },
  paginationScroll: { paddingHorizontal: 16, gap: 10 },
  pageTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#141417', borderWidth: 1, borderColor: 'rgba(154, 160, 174, 0.2)' },
  pageTabActive: { backgroundColor: 'rgba(226, 28, 72, 0.15)', borderColor: '#e21c48' },
  pageTabText: { color: '#9aa0ae', fontSize: 12, fontWeight: '700' },
  pageTabTextActive: { color: '#e21c48' },
  
  listContainer: { paddingBottom: 40 },
  row: { justifyContent: 'flex-start', paddingHorizontal: 12, gap: 10, marginBottom: 10 },
  
  epCard: { width: (width - 54) / 4, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  epLabel: { fontSize: 13, fontWeight: 'bold', color: '#d1d5db', marginBottom: 4 },
  epBadges: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subText: { fontSize: 9, fontWeight: '900', color: 'rgba(226, 28, 72, 0.8)', letterSpacing: 1 },
  dubText: { fontSize: 9, fontWeight: '900', color: 'rgba(96, 165, 250, 0.8)', letterSpacing: 1 },
  dividerText: { fontSize: 9, color: '#4b5563' },
  
  emptyText: { color: '#9aa0ae', textAlign: 'center', marginTop: 40, fontSize: 14 }
});