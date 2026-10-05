import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, StatusBar 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/apiService';

const { width } = Dimensions.get('window');
const numColumns = 3;
const cardSpacing = 12;
const cardWidth = (width - (cardSpacing * 4)) / numColumns;

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Live Search with 500ms Debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      const data = await api.searchAnime(query);
      setResults(data || []);
      setLoading(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const renderGridCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.6}
      onPress={() => navigation.navigate('Details', { animeId: item.id || item.identifire, title: item.title, poster: item.image || item.poster })}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image || item.poster }} style={styles.poster} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>{item.title || item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (loading) return <ActivityIndicator size="large" color="#e21c48" style={{ marginTop: 40 }} />;
    if (!query.trim()) return (
      <View style={styles.emptyContainer}>
        <Icon name="time-outline" size={50} color="rgba(154, 160, 174, 0.3)" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>Search the Void</Text>
        <Text style={styles.emptyText}>Type an anime name. Results will appear automatically.</Text>
      </View>
    );
    
    return (
      <View style={styles.emptyContainer}>
        <Icon name="search-outline" size={50} color="rgba(154, 160, 174, 0.3)" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>No signals found</Text>
        <Text style={styles.emptyText}>We couldn't find matches for "{query}".</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#09090b" barStyle="light-content" />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#9aa0ae" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Type to search..."
            placeholderTextColor="#9aa0ae"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name="close-circle" size={20} color="#9aa0ae" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item, index) => `search-${item.id || item.identifire || index}`}
        renderItem={renderGridCard}
        numColumns={numColumns}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#09090b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141417', borderRadius: 8, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: 'rgba(154, 160, 174, 0.2)' },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '600' },
  listContainer: { paddingTop: 24, paddingBottom: 20 },
  row: { justifyContent: 'flex-start', paddingHorizontal: 12, marginBottom: cardSpacing, gap: cardSpacing },
  card: { width: cardWidth, backgroundColor: '#141417', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(154, 160, 174, 0.15)' },
  imageContainer: { width: '100%', height: cardWidth * 1.45 },
  poster: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardContent: { padding: 8, height: 50, justifyContent: 'center' },
  title: { fontSize: 11, fontWeight: '700', color: '#9aa0ae', lineHeight: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  emptyText: { fontSize: 12, color: '#9aa0ae', textAlign: 'center' }
});