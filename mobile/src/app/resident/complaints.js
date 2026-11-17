// Resident complaints list + button to raise a new one.
import { router } from 'expo-router';
import { FlatList, RefreshControl, View } from 'react-native';
import Button from '../../components/Button';
import ComplaintCard from '../../components/ComplaintCard';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Loader from '../../components/Loader';
import { useApi } from '../../hooks/useApi';
import { spacing } from '../../theme';

export default function ResidentComplaints() {
  const { data, loading, refreshing, error, refresh } = useApi('/complaints', { initial: [] });
  if (loading) return <Loader />;

  return (
    <FlatList
      data={data}
      keyExtractor={(c) => String(c.id)}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <ErrorBanner message={error} />
          <Button title="+ Raise a complaint" onPress={() => router.push('/complaint/new')} />
        </View>
      }
      ListEmptyComponent={<EmptyState icon="construct-outline" title="No complaints" message="Lift not working? Water leakage? Raise a complaint with a photo." />}
      renderItem={({ item }) => <ComplaintCard complaint={item} />}
    />
  );
}
