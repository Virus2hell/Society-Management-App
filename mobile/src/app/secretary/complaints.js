// All complaints in the society with a status filter.
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import ComplaintCard from '../../components/ComplaintCard';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Loader from '../../components/Loader';
import OptionPicker from '../../components/OptionPicker';
import { useApi } from '../../hooks/useApi';
import { spacing } from '../../theme';

const FILTERS = { All: null, Open: 'open', 'In progress': 'in_progress', Resolved: 'resolved' };

export default function SecretaryComplaints() {
  const [filter, setFilter] = useState('All');
  const { data, loading, refreshing, error, refresh } = useApi('/complaints', { initial: [], pollMs: 15000 });

  if (loading) return <Loader />;
  const rows = FILTERS[filter] ? data.filter((c) => c.status === FILTERS[filter]) : data;

  return (
    <FlatList
      data={rows}
      keyExtractor={(c) => String(c.id)}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View>
          <ErrorBanner message={error} />
          <OptionPicker options={Object.keys(FILTERS)} value={filter} onChange={setFilter} wrap={false} />
        </View>
      }
      ListEmptyComponent={<EmptyState icon="happy-outline" title="No complaints here" />}
      renderItem={({ item }) => <ComplaintCard complaint={item} showFlat />}
    />
  );
}
