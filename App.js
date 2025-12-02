// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TimerScreen from './src/screens/TimerScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen
            name="Zamanlayici"
            component={TimerScreen}
            options={{ tabBarLabel: 'Zamanlayıcı' }}
          />
          <Tab.Screen
            name="Raporlar"
            component={ReportsScreen}
            options={{ tabBarLabel: 'Raporlar' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
