import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api/apiService';

export default function DetailsScreen({ route, navigation }) {
  const { animeId, title } = route.params;
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEps = async () => {
      const data = await api.getEpisodes(animeId);
      setEpisodes(data);
      setLoading(false);
    };
    fetchEps();
  }, [animeId]);

  if (loading) return <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1, backgroundColor: '#0f172a' }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={episodes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.epCard}
            onPress={() => navigation.navigate('Player', { episodeId: item.id })}
          >
            <Text style={styles.epText}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  epCard: { backgroundColor: '#334155', padding: 15, marginBottom: 10, borderRadius: 5 },
  epText: { color: '#f8fafc', fontSize: 16 }
});