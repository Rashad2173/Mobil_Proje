// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TimerScreen from './src/screens/TimerScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import TasksScreen from './src/screens/TasksScreen';

import { FontAwesome5 } from '@expo/vector-icons'; // 🔥 FONT AWESOME 5

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#0f172a',
              borderTopColor: '#1e293b',
            },
            tabBarActiveTintColor: '#4f46e5',
            tabBarInactiveTintColor: '#94a3b8',

            // 🔥 Her sayfa için ikon
            tabBarIcon: ({ color, size }) => {
              let iconName;

              if (route.name === 'Zamanlayici') {
                iconName = 'stopwatch';
              } else if (route.name === 'Raporlar') {
                iconName = 'chart-bar';
              } else if (route.name === 'Görevler') {
                iconName = 'tasks';
              }

              return <FontAwesome5 name={iconName} size={size} color={color} />;
            },
          })}
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

          <Tab.Screen
            name="Görevler"
            component={TasksScreen}
            options={{ tabBarLabel: 'Görevler' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
