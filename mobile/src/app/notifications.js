// List of all notifications for the logged-in user. Opening it marks them read.
import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { useNotifications } from '../context/NotificationContext';
import { colors, spacing } from '../theme';
import { timeAgo } from '../utils/format';

export default function NotificationsScreen() {
  const { items, markAllRead, openNotification } = useNotifications();

  useEffect(() => {
    const t = setTimeout(markAllRead, 1500); // let the user see what's new first
    return () => clearTimeout(t);
  }, [markAllRead]);

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => String(n.id)}
      contentContainerStyle={{ padding: spacing.lg }}
      ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="No notifications" message="Visitor requests, bills and replies will appear here." />}
      renderItem={({ item }) => {
        return (
          <Card onPress={() => openNotification(item.data)} style={!item.read && styles.unread}>
            <View style={styles.row}>
              {!item.read && <View style={styles.dot} />}
              <Text style={styles.title}>{item.title}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  unread: { borderColor: colors.primary, backgroundColor: '#F8FAFF' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: 8 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  body: { fontSize: 14, color: colors.muted, marginTop: 4 },
  time: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
});
