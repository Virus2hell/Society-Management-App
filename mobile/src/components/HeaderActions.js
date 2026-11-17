// Icons on the right of every tab header: switch society, bell (unread count), logout.
// Pass showSwitch={false} / showBell={false} to hide some of them.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { colors } from '../theme';

export default function HeaderActions({ showSwitch = true, showBell = true }) {
  const { logout } = useAuth();
  const { unread } = useNotifications();

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Log out?')) logout();
      return;
    }
    Alert.alert('Log out', 'Do you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.row}>
      {showSwitch && (
        <Pressable onPress={() => router.push('/societies')} hitSlop={10} style={styles.icon}>
          <Ionicons name="swap-horizontal-outline" size={23} color={colors.text} />
        </Pressable>
      )}
      {showBell && (
        <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.icon}>
          <Ionicons name="notifications-outline" size={23} color={colors.text} />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
      )}
      <Pressable onPress={confirmLogout} hitSlop={10} style={styles.icon}>
        <Ionicons name="log-out-outline" size={23} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  icon: { marginLeft: 16 },
  badge: {
    position: 'absolute', top: -6, right: -8, backgroundColor: colors.danger,
    borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
});
