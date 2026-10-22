import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlantProvider } from '../state/PlantProvider';
import { palette } from '../ui/theme';

export default function RootLayout() {
  return <SafeAreaProvider><PlantProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.canvas } }}>
      <Stack.Screen name="settings" options={{ animation: 'fade' }} />
      <Stack.Screen name="history" options={{ animation: 'fade', contentStyle: { backgroundColor: palette.surface } }} />
    </Stack>
  </PlantProvider></SafeAreaProvider>;
}
