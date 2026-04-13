import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGameStore } from './src/store/gameStore';
import { MenuScreen } from './src/screens/MenuScreen';
import { GameScreen } from './src/screens/GameScreen';
import { SaveLoadScreen } from './src/screens/SaveLoadScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { COLORS } from './src/constants/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={{
        dark: true,
        colors: {
          primary: COLORS.gold,
          background: COLORS.surface,
          card: COLORS.surfaceMid,
          text: COLORS.textPrimary,
          border: COLORS.borderSolid,
          notification: COLORS.danger,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' as const },
          medium: { fontFamily: 'System', fontWeight: '500' as const },
          bold: { fontFamily: 'System', fontWeight: '700' as const },
          heavy: { fontFamily: 'System', fontWeight: '900' as const },
        },
      }}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const screen = useGameStore(s => s.screen);

  return (
    <Stack.Navigator screenOptions={{
      headerShown: false,
      animation: 'fade',
      contentStyle: { backgroundColor: COLORS.surface },
    }}>
      {screen === 'menu' ? (
        <>
          <Stack.Screen name="Menu" component={MenuScreen} />
          <Stack.Screen
            name="SaveLoad"
            component={SaveLoadScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </>
      ) : (
        <Stack.Screen name="Game" component={GameScreen} />
      )}
    </Stack.Navigator>
  );
}
