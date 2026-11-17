// Watchman gate screen:
// 1. Form to log a walk-in visitor -> the flat gets a notification.
// 2. Live list (refreshes every 4s) of visitors waiting for approval,
//    approved ones to let in, and denied ones.
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ErrorBanner from '../../components/ErrorBanner';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import VisitorCard from '../../components/VisitorCard';
import { useApi } from '../../hooks/useApi';
import { colors, spacing } from '../../theme';
import { toISODate } from '../../utils/format';

const PURPOSES = ['Guest', 'Delivery', 'Cab', 'Service'];
const EMPTY = { name: '', phone: '', purpose: 'Guest', flat: '' };

export default function WatchmanGate() {
  const { data: society } = useApi('/society');
  const { data, refreshing, error, refresh, reload } = useApi('/visitors', {
    params: { status: 'pending,approved,denied' },
    pollMs: 4000,
    initial: [],
  });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) return Alert.alert('Missing details', 'Enter the visitor name');
    if (!form.flat) return Alert.alert('Missing details', 'Select the flat they are visiting');
    setSaving(true);
    try {
      await api.post('/visitors', form);
      setForm(EMPTY);
      await reload();
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const allowEntry = async (visitor) => {
    setBusyId(visitor.id);
    try {
      await api.post(`/visitors/${visitor.id}/checkin`);
      await reload();
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const today = toISODate();
  const walkins = data.filter((v) => v.type === 'walkin' && v.createdAt.slice(0, 10) === today);
  const waiting = walkins.filter((v) => v.status === 'pending');
  const approved = walkins.filter((v) => v.status === 'approved');
  const denied = walkins.filter((v) => v.status === 'denied').slice(0, 5);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <ErrorBanner message={error} />
        <Card>
          <Text style={styles.cardTitle}>New visitor</Text>
          <TextField label="Visitor name" value={form.name} onChangeText={set('name')} placeholder="e.g. Amit / Swiggy / Ola" />
          <TextField label="Phone (optional)" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} />
          <OptionPicker label="Purpose" options={PURPOSES} value={form.purpose} onChange={set('purpose')} />
          <OptionPicker label="Visiting flat" options={society?.flats || []} value={form.flat} onChange={set('flat')} />
          <Button title="Ask resident for approval" onPress={submit} loading={saving} />
        </Card>

        {approved.length > 0 && <Text style={[styles.section, { color: colors.success }]}>Approved — let them in</Text>}
        {approved.map((v) => (
          <VisitorCard key={v.id} visitor={v}
            actions={<Button small title="Allow entry" variant="success" style={{ flex: 1 }} loading={busyId === v.id} onPress={() => allowEntry(v)} />}
          />
        ))}

        <Text style={[styles.section, { color: colors.warning }]}>Waiting for resident ({waiting.length})</Text>
        {waiting.length === 0 && <Text style={styles.empty}>No one waiting right now.</Text>}
        {waiting.map((v) => <VisitorCard key={v.id} visitor={v} />)}

        {denied.length > 0 && <Text style={[styles.section, { color: colors.danger }]}>Denied — do not allow</Text>}
        {denied.map((v) => <VisitorCard key={v.id} visitor={v} />)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 40 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  section: { fontSize: 15, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.md },
  empty: { color: colors.muted, fontSize: 14 },
});
