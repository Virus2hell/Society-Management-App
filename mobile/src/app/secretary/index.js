// Secretary dashboard: society join code (share / regenerate), pending join
// requests, collection status, complaints and visitors today.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ErrorBanner from '../../components/ErrorBanner';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { colors, radius, spacing } from '../../theme';
import { formatMoney, formatMonth } from '../../utils/format';

export default function SecretaryDashboard() {
  const { user, activeMembership } = useAuth();
  const { data, setData, refreshing, error, refresh } = useApi('/society/dashboard', { pollMs: 10000 });
  const [regenerating, setRegenerating] = useState(false);
  const d = data || {};
  const societyName = activeMembership?.society?.name || 'our society';
  const total = (d.collected || 0) + (d.pendingAmount || 0);
  const percent = total ? Math.round((d.collected / total) * 100) : 0;

  const shareCode = () =>
    Share.share({
      message:
        `Join ${societyName} on Society Manager!\n\n` +
        `1. Install the app and create an account\n` +
        `2. Tap "Join a society with code"\n` +
        `3. Enter code: ${d.code}\n\n` +
        `I will approve your request.`,
    });

  const regenerate = () => {
    const run = async () => {
      setRegenerating(true);
      try {
        const { data: res } = await api.post('/society/regenerate-code');
        setData((prev) => ({ ...prev, code: res.code }));
      } catch (e) {
        Alert.alert('Error', errorMessage(e));
      } finally {
        setRegenerating(false);
      }
    };
    const msg = 'The old code will stop working. Existing members are not affected.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Generate a new code?\n${msg}`)) run();
      return;
    }
    Alert.alert('Generate a new code?', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Generate', onPress: run }]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.hello}>Hello, {user.name}</Text>
      <Text style={styles.sub}>Secretary • {societyName}</Text>
      <ErrorBanner message={error} />

      <Card style={styles.codeCard}>
        <Text style={styles.codeLabel}>SOCIETY JOIN CODE</Text>
        <Text style={styles.code}>{d.code || '------'}</Text>
        <Text style={styles.codeHint}>Share this with residents and watchmen. You approve everyone who joins.</Text>
        <View style={styles.codeActions}>
          <Button small title="Share code" onPress={shareCode} disabled={!d.code} style={{ flex: 1 }} />
          <Button small variant="outline" title="New code" onPress={regenerate} loading={regenerating} style={{ flex: 1 }} />
        </View>
      </Card>

      {d.pendingRequests > 0 && (
        <Card style={styles.alert} onPress={() => router.push('/secretary/members')}>
          <View style={styles.alertRow}>
            <Ionicons name="person-add-outline" size={20} color={colors.warning} />
            <Text style={styles.alertText}>
              {d.pendingRequests} join request{d.pendingRequests > 1 ? 's' : ''} waiting for approval
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </Card>
      )}

      <Card onPress={() => router.push('/secretary/dues')}>
        <Text style={styles.cardLabel}>Collection — {d.month ? formatMonth(d.month) : ''}</Text>
        <Text style={styles.big}>{formatMoney(d.collected || 0)} <Text style={styles.of}>of {formatMoney(total)}</Text></Text>
        <View style={styles.bar}><View style={[styles.barFill, { width: `${percent}%` }]} /></View>
        <Text style={styles.cardLabel}>
          {total ? `${percent}% collected • ${d.unpaidFlats} flat${d.unpaidFlats === 1 ? '' : 's'} unpaid` : 'No bills this month yet. Tap to generate.'}
        </Text>
      </Card>

      <View style={styles.grid}>
        <StatCard icon="alert-circle-outline" label="Open complaints" value={d.openComplaints ?? '-'} color={colors.danger}
          onPress={() => router.push('/secretary/complaints')} />
        <StatCard icon="time-outline" label="In progress" value={d.inProgressComplaints ?? '-'} color={colors.warning}
          onPress={() => router.push('/secretary/complaints')} />
        <StatCard icon="people-outline" label={`Residents • ${d.flats ?? '-'} flats`} value={d.residents ?? '-'}
          onPress={() => router.push('/secretary/members')} />
        <StatCard icon="walk-outline" label="Visitors today" value={d.visitorsToday ?? '-'} color={colors.success} />
      </View>

      <Text style={styles.section}>Quick actions</Text>
      <View style={styles.actions}>
        <Button title="Post notice" onPress={() => router.push('/notice/new')} style={{ flex: 1 }} />
        <Button title="Generate bills" variant="outline" onPress={() => router.push('/secretary/dues')} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  hello: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginBottom: spacing.lg },
  codeCard: { alignItems: 'center', backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  codeLabel: { fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 8, color: colors.text, marginVertical: spacing.sm },
  codeHint: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  codeActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
  alert: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertText: { flex: 1, color: colors.text, fontWeight: '600' },
  cardLabel: { fontSize: 13, color: colors.muted },
  big: { fontSize: 26, fontWeight: '700', color: colors.text, marginVertical: spacing.sm },
  of: { fontSize: 15, fontWeight: '400', color: colors.muted },
  bar: { height: 8, borderRadius: radius.sm, backgroundColor: colors.border, marginBottom: spacing.sm, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.success },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  section: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
});
