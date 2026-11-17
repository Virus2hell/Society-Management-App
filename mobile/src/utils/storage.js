// Saves the login token safely on the phone (Keychain / Keystore).
// SecureStore does not exist on web, so we fall back to localStorage there.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function saveItem(key, value) {
  if (isWeb) return localStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

export async function getItem(key) {
  if (isWeb) return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function deleteItem(key) {
  if (isWeb) return localStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}
