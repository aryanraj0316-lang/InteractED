import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import Splash from '../components/Splash';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'login' | '(tabs)'>('login');

  useEffect(() => {
    const prepare = async () => {
      const token = await SecureStore.getItemAsync('userToken');

      if (token) {
        setInitialRoute('(tabs)');
      } else {
        setInitialRoute('login');
      }
    };

    prepare();
  }, []);

  if (!isReady) {
    return <Splash onFinish={() => setIsReady(true)} />;
  }

  return (
    <Stack
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
