import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PlayerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Native Player Will Go Here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
});