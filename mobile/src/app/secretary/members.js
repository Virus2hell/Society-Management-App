// Members tab for the secretary:
//   - Join requests: approve / reject people who entered the society code
//   - Members: everyone approved, with "Remove" for people who moved out
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ErrorBanner from '../../components/ErrorBanner';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { colors, spacing } from '../../theme';
import { timeAgo } from '../../utils/format';

const ROLE_BADGE = { secretary: 'approved', watchman: 'in_progress', resident: 'exited' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function confirm(title, message, onYes) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: onYes }]);
}

export default function Members() {
  const { user } = useAuth();
  const requests = useApi('/society/requests', { initial: [], pollMs: 8000 });
  const members = useApi('/society/members', { initial: [] });
  const [busy, setBusy] = useState(null); // `${id}-${action}`

  const decide = async (req, decision) => {
    setBusy(`${req.id}-${decision}`);
    try {
      await api.post(`/society/requests/${req.id}/decide`, { decision });
      await Promise.all([requests.reload(), members.reload()]);
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const removeMember = (m) =>
    confirm('Remove member?', `${m.name} will lose access to this society.`, async () => {
      try {
        await api.delete(`/society/members/${m.id}`);
        await members.reload();
      } catch (e) {
        Alert.alert('Error', errorMessage(e));
      }
    });

  const onPull = () => {
    requests.refresh();
    members.refresh();
  };

  if (requests.loading || members.loading) return <Loader />;

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={requests.refreshing || members.refreshing} onRefresh={onPull} />}
    >
      <ErrorBanner message={requests.error || members.error} />

      <Text style={styles.section}>Join requests ({requests.data.length})</Text>
      {requests.data.length === 0 && <Text style={styles.empty}>No pending requests. Share your society code from the dashboard.</Text>}
      {requests.data.map((r) => (
        <Card key={r.id} style={styles.request}>
          <Text style={styles.name}>{r.name}</Text>
          <Text style={styles.meta}>{r.email}</Text>
          <Text style={styles.wants}>
            Wants to join as <Text style={styles.strong}>{r.role === 'resident' ? `Resident of ${r.flat}` : 'Watchman'}</Text>
          </Text>
          <Text style={styles.meta}>{timeAgo(r.createdAt)}</Text>
          <View style={styles.actions}>
            <Button small title="Approve" variant="success" style={{ flex: 1 }}
              loading={busy === `${r.id}-approved`} disabled={!!busy} onPress={() => decide(r, 'approved')} />
            <Button small title="Reject" variant="danger" style={{ flex: 1 }}
              loading={busy === `${r.id}-rejected`} disabled={!!busy} onPress={() => decide(r, 'rejected')} />
          </View>
        </Card>
      ))}

      <Text style={styles.section}>Members ({members.data.length})</Text>
      {members.data.map((m) => (
        <Card key={m.id} style={styles.row}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{m.name[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{m.name}{m.userId === user.id ? ' (you)' : ''}</Text>
            <Text style={styles.meta}>{m.flat ? `Flat ${m.flat} • ` : ''}{m.email}</Text>
            <View style={{ marginTop: 6 }}>
              <StatusBadge status={ROLE_BADGE[m.role]} label={cap(m.role)} />
            </View>
          </View>
          {m.userId !== user.id && (
            <Pressable onPress={() => removeMember(m)} hitSlop={10}>
              <Ionicons name="person-remove-outline" size={21} color={colors.danger} />
            </Pressable>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  empty: { color: colors.muted, fontSize: 14, marginBottom: spacing.lg },
  request: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  wants: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  strong: { fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
