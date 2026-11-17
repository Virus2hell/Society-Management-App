// Resident home: greeting, quick numbers, latest notice and shortcuts.
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ErrorBanner from '../../components/ErrorBanner';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { colors, spacing } from '../../theme';
import { formatMoney, timeAgo } from '../../utils/format';

export default function ResidentHome() {
  const { user, activeMembership } = useAuth();
  const { data, refreshing, error, refresh } = useApi('/society/dashboard', { pollMs: 10000 });
  const d = data || {};

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.hello}>Hello, {user.name.split(' ')[0]} 👋</Text>
      <Text style={styles.flat}>Flat {activeMembership.flat} • {activeMembership.society?.name}</Text>
      <ErrorBanner message={error} />

      {d.pendingVisitors > 0 && (
        <Card style={styles.alert} onPress={() => router.push('/resident/visitors')}>
          <Text style={styles.alertText}>
            🔔 {d.pendingVisitors} visitor{d.pendingVisitors > 1 ? 's are' : ' is'} waiting at the gate. Tap to respond.
          </Text>
        </Card>
      )}

      <View style={styles.grid}>
        <StatCard icon="wallet-outline" label="Amount due" value={formatMoney(d.amountDue || 0)}
          color={d.amountDue ? colors.danger : colors.success} onPress={() => router.push('/resident/dues')} />
        <StatCard icon="people-outline" label="Guests inside" value={d.guestsInside ?? '-'}
          onPress={() => router.push('/resident/visitors')} />
        <StatCard icon="construct-outline" label="Open complaints" value={d.openComplaints ?? '-'}
          color={colors.warning} onPress={() => router.push('/resident/complaints')} />
        <StatCard icon="document-text-outline" label="Unpaid bills" value={d.unpaidBills ?? '-'}
          color={colors.danger} onPress={() => router.push('/resident/dues')} />
      </View>

      <Text style={styles.section}>Quick actions</Text>
      <View style={styles.actions}>
        <Button title="Invite a guest" onPress={() => router.push('/visitor/preapprove')} style={{ flex: 1 }} />
        <Button title="Raise complaint" variant="outline" onPress={() => router.push('/complaint/new')} style={{ flex: 1 }} />
      </View>

      {d.latestNotice && (
        <>
          <Text style={styles.section}>Latest notice</Text>
          <Card onPress={() => router.push('/resident/notices')}>
            <Text style={styles.noticeTitle}>{d.latestNotice.title}</Text>
            <Text style={styles.noticeBody} numberOfLines={3}>{d.latestNotice.body}</Text>
            <Text style={styles.noticeMeta}>{timeAgo(d.latestNotice.createdAt)}</Text>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  hello: { fontSize: 22, fontWeight: '700', color: colors.text },
  flat: { fontSize: 14, color: colors.muted, marginBottom: spacing.lg },
  alert: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  alertText: { color: colors.text, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  section: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  noticeTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  noticeBody: { fontSize: 14, color: colors.muted, marginTop: 4 },
  noticeMeta: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
});
