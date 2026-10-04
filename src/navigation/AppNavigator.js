import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CatalogScreen from '../screens/CatalogScreen';
import SearchScreen from '../screens/SearchScreen';
import DetailsScreen from '../screens/DetailsScreen';
import PlayerScreen from '../screens/PlayerScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Catalog"
        screenOptions={{
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Home' }} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} options={{ title: 'Episode List' }} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}