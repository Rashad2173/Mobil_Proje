import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import TimerScreen from './src/screens/TimerScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Zamanlayici" component={TimerScreen} />
        <Tab.Screen name="Raporlar" component={ReportsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
