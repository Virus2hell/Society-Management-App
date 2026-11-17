// Visitor log: who is inside right now (with "Mark exit") and today's history.
import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Loader from '../../components/Loader';
import OptionPicker from '../../components/OptionPicker';
import VisitorCard from '../../components/VisitorCard';
import { useApi } from '../../hooks/useApi';
import { colors, spacing } from '../../theme';
import { toISODate } from '../../utils/format';

const TABS = ['Inside now', 'Today', 'All'];

export default function VisitorLog() {
  const { data, loading, refreshing, error, refresh, reload } = useApi('/visitors', { pollMs: 8000, initial: [] });
  const [tab, setTab] = useState(TABS[0]);
  const [busyId, setBusyId] = useState(null);

  const markExit = async (visitor) => {
    setBusyId(visitor.id);
    try {
      await api.post(`/visitors/${visitor.id}/checkout`);
      await reload();
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader />;

  const today = toISODate();
  const rows = data.filter((v) => {
    if (tab === 'Inside now') return v.status === 'inside';
    if (tab === 'Today') return (v.entryAt || v.createdAt).slice(0, 10) === today && v.status !== 'approved';
    return v.status !== 'approved' || v.type === 'walkin';
  });

  return (
    <FlatList
      data={rows}
      keyExtractor={(v) => String(v.id)}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View>
          <ErrorBanner message={error} />
          <OptionPicker options={TABS} value={tab} onChange={setTab} />
          <Text style={styles.count}>{rows.length} visitor{rows.length === 1 ? '' : 's'}</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="people-outline" title="Nothing here" />}
      renderItem={({ item }) => (
        <VisitorCard
          visitor={item}
          actions={item.status === 'inside' ? (
            <Button small title="Mark exit" variant="outline" style={{ flex: 1 }} loading={busyId === item.id} onPress={() => markExit(item)} />
          ) : null}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  count: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
});
