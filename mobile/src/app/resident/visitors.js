// Resident visitors: approve/deny people waiting at the gate, invite guests
// (QR pass) and see the visitor history of the flat. Refreshes every 5s.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Loader from '../../components/Loader';
import VisitorCard from '../../components/VisitorCard';
import { useApi } from '../../hooks/useApi';
import { colors, spacing } from '../../theme';

export default function ResidentVisitors() {
  const { data, loading, refreshing, error, refresh, reload } = useApi('/visitors', { pollMs: 5000, initial: [] });
  const [busyId, setBusyId] = useState(null);

  const respond = async (visitor, decision) => {
    setBusyId(visitor.id);
    try {
      await api.post(`/visitors/${visitor.id}/respond`, { decision });
      await reload();
    } catch (e) {
      Alert.alert('Could not update', errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader />;

  const pending = data.filter((v) => v.status === 'pending');
  const others = data.filter((v) => v.status !== 'pending');

  return (
    <FlatList
      data={others}
      keyExtractor={(v) => String(v.id)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View>
          <ErrorBanner message={error} />
          <Button title="+ Invite a guest (QR gate pass)" onPress={() => router.push('/visitor/preapprove')} />

          {pending.length > 0 && <Text style={[styles.section, { color: colors.warning }]}>Waiting at the gate</Text>}
          {pending.map((v) => (
            <VisitorCard
              key={v.id}
              visitor={v}
              showFlat={false}
              actions={
                <>
                  <Button small title="Approve" variant="success" style={{ flex: 1 }}
                    loading={busyId === v.id} onPress={() => respond(v, 'approved')} />
                  <Button small title="Deny" variant="danger" style={{ flex: 1 }}
                    disabled={busyId === v.id} onPress={() => respond(v, 'denied')} />
                </>
              }
            />
          ))}
          <Text style={styles.section}>History & gate passes</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="people-outline" title="No visitors yet" message="Visitors logged by the watchman and guests you invite show up here." />}
      renderItem={({ item }) => (
        <VisitorCard
          visitor={item}
          showFlat={false}
          onPress={item.type === 'preapproved' ? () => router.push(`/visitor/pass/${item.id}`) : undefined}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  section: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
});
