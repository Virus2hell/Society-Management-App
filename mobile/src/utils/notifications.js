// Everything about phone notifications in one file.
//
// - Local notifications work everywhere (including Expo Go).
// - Remote push needs a development/release build (Expo Go on Android
//   dropped remote push in SDK 53), so registerForPush() quietly returns
//   null there and the app falls back to polling the API.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

// Show notifications as a banner even when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Society updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.granted;
  }
  return granted;
}

// Returns an Expo push token like "ExponentPushToken[xxx]" or null
export async function registerForPush() {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return null;
    if (Platform.OS === 'android' && isRunningInExpoGo()) return null; // not supported
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null; // run `eas init` once to get a projectId
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e) {
    console.log('Push registration skipped:', e.message);
    return null;
  }
}

// Shows a notification right now on this phone
export async function showLocalNotification(title, body, data = {}) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body, data }, trigger: null });
  } catch (e) {
    console.log('Local notification failed:', e.message);
  }
}

export { Notifications };
