// Root of the app (Expo Router). Wraps every screen with the login and
// notification providers and declares the stack screens + their titles.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Loader from '../components/Loader';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar style="dark" />
        <AppStack />
      </NotificationProvider>
    </AuthProvider>
  );
}

// Waits until the saved login is restored, so no screen calls the API
// without the token (important when the app opens straight on a deep link).
function AppStack() {
  const { loading } = useAuth();
  if (loading) return <Loader />;
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { fontWeight: '600' },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: 'Create account' }} />
      <Stack.Screen name="societies" options={{ title: 'My societies' }} />
      <Stack.Screen name="society/create" options={{ title: 'Create a society' }} />
      <Stack.Screen name="society/join" options={{ title: 'Join a society' }} />
      <Stack.Screen name="resident" options={{ headerShown: false }} />
      <Stack.Screen name="watchman" options={{ headerShown: false }} />
      <Stack.Screen name="secretary" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="visitor/preapprove" options={{ title: 'Invite a guest' }} />
      <Stack.Screen name="visitor/pass/[id]" options={{ title: 'Gate pass' }} />
      <Stack.Screen name="complaint/new" options={{ title: 'Raise a complaint' }} />
      <Stack.Screen name="complaint/[id]" options={{ title: 'Complaint' }} />
      <Stack.Screen name="notice/new" options={{ title: 'Post a notice' }} />
    </Stack>
  );
}
