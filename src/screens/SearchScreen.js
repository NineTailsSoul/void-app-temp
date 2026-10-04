import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../api/apiService';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const data = await api.searchAnime(query);
    setResults(data);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput 
          style={styles.input} 
          placeholder="Search anime..." 
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
        />
        <Button title="Search" onPress={handleSearch} color="#6366f1" />
      </View>
      
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('Details', { animeId: item.id, title: item.title })}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  searchRow: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, backgroundColor: '#1e293b', color: '#fff', padding: 10, marginRight: 10, borderRadius: 5 },
  card: { backgroundColor: '#1e293b', padding: 15, marginBottom: 10, borderRadius: 5 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' }
});