// Works out the URL of the backend.
// When you run `npx expo start`, Expo knows your laptop's IP (hostUri),
// so we reuse that IP with port 4000. No manual setup needed on the same Wi-Fi.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 4000;

function detectApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.5:8081"
  const host = hostUri ? hostUri.split(':')[0] : null;
  if (host && !host.includes('exp.direct')) return `http://${host}:${API_PORT}`;

  // Android emulator reaches the laptop through 10.0.2.2
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`;
  return `http://localhost:${API_PORT}`;
}

export const API_URL = detectApiUrl();

// Turns "/uploads/x.jpg" from the API into a full URL for <Image>
export const fileUrl = (path) => (path ? `${API_URL}${path}` : null);
