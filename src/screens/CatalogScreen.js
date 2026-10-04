import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function CatalogScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Void Anime Catalog</Text>
      <Button 
        title="Go to Episode Details" 
        color="#6366f1"
        onPress={() => navigation.navigate('Search')} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20 },
});