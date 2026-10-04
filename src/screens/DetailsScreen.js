import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function DetailsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Episode Details</Text>
      <Button 
        title="Play Episode" 
        color="#10b981"
        onPress={() => navigation.navigate('Player')} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20 },
});