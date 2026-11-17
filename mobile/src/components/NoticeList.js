// Notice board list used by all three roles. The secretary also gets
// a "Post notice" button and can long-press a notice to delete it.
import { router } from 'expo-router';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import { colors, spacing } from '../theme';
import { formatDateTime } from '../utils/format';
import Button from './Button';
import Card from './Card';
import EmptyState from './EmptyState';
import ErrorBanner from './ErrorBanner';
import Loader from './Loader';

export default function NoticeList({ canManage = false }) {
  const { data, loading, refreshing, error, refresh, reload } = useApi('/notices', { initial: [] });

  const confirmDelete = (notice) => {
    if (!canManage) return;
    Alert.alert('Delete notice?', notice.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/notices/${notice.id}`);
            reload();
          } catch (e) {
            Alert.alert('Error', errorMessage(e));
          }
        },
      },
    ]);
  };

  if (loading) return <Loader />;

  return (
    <FlatList
      data={data}
      keyExtractor={(n) => String(n.id)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View>
          <ErrorBanner message={error} />
          {canManage && (
            <Button title="+ Post a notice" onPress={() => router.push('/notice/new')} style={{ marginBottom: spacing.md }} />
          )}
        </View>
      }
      ListEmptyComponent={<EmptyState icon="megaphone-outline" title="No notices yet" />}
      renderItem={({ item }) => (
        <Card
          style={item.important && styles.important}
          onPress={canManage ? () => confirmDelete(item) : undefined}
        >
          {item.important && <Text style={styles.tag}>IMPORTANT</Text>}
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.meta}>{item.postedBy} • {formatDateTime(item.createdAt)}</Text>
        </Card>
      )}
      ListFooterComponent={
        canManage && data.length ? <Text style={styles.hint}>Tap a notice to delete it.</Text> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  important: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  tag: { fontSize: 11, fontWeight: '700', color: colors.warning, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.text, marginTop: 6, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 12 },
});
