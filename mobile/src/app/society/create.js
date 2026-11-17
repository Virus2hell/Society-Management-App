// Secretary registers a new society. Flats are generated from
// wings + floors + flats per floor (A-101, A-102 ... B-704), so residents
// pick their flat from a list instead of typing it.
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ErrorBanner from '../../components/ErrorBanner';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

// Same rule as backend/src/flats.js, used for the live preview
function previewFlats(wings, floors, perFloor) {
  const w = wings.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
  const f = Number(floors);
  const n = Number(perFloor);
  if (!(f > 0 && n > 0)) return { count: 0, sample: [] };
  const label = (wing, floor, i) => `${wing ? `${wing}-` : ''}${floor}${String(i).padStart(2, '0')}`;
  const wingList = w.length ? w : [''];
  const count = wingList.length * f * n;
  const first = wingList[0];
  const last = wingList[wingList.length - 1];
  return { count, sample: [label(first, 1, 1), label(first, 1, Math.min(2, n)), label(last, f, n)] };
}

export default function CreateSociety() {
  const { refresh, selectSociety } = useAuth();
  const [form, setForm] = useState({ name: '', address: '', city: '', wings: 'A,B', floors: '7', flatsPerFloor: '4' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const preview = previewFlats(form.wings, form.floors, form.flatsPerFloor);

  const submit = async () => {
    if (!form.name.trim()) return setError('Enter the society name');
    if (!preview.count) return setError('Enter floors and flats per floor');
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post('/societies', {
        ...form,
        floors: Number(form.floors),
        flatsPerFloor: Number(form.flatsPerFloor),
      });
      await refresh();
      await selectSociety(data.society.id);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/secretary'); // dashboard shows the join code to share
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.info}>You will be the secretary. After creating, you get a 6-digit code to share with residents and watchmen.</Text>
        <ErrorBanner message={error} />
        <TextField label="Society name" value={form.name} onChangeText={set('name')} placeholder="e.g. Sea View CHS" />
        <TextField label="Address / area" value={form.address} onChangeText={set('address')} placeholder="e.g. Hill Road, Bandra West" />
        <TextField label="City" value={form.city} onChangeText={set('city')} placeholder="e.g. Mumbai" />

        <Text style={styles.section}>Building layout</Text>
        <TextField label="Wings (comma separated, leave empty if none)" value={form.wings} onChangeText={set('wings')} autoCapitalize="characters" placeholder="e.g. A,B,C" />
        <View style={styles.row}>
          <TextField style={{ flex: 1 }} label="Floors" value={form.floors} onChangeText={set('floors')} keyboardType="number-pad" maxLength={2} />
          <TextField style={{ flex: 1 }} label="Flats per floor" value={form.flatsPerFloor} onChangeText={set('flatsPerFloor')} keyboardType="number-pad" maxLength={2} />
        </View>
        <Card style={styles.preview}>
          <Text style={styles.previewText}>
            {preview.count
              ? `${preview.count} flats will be created: ${preview.sample[0]}, ${preview.sample[1]} … ${preview.sample[2]}`
              : 'Enter floors and flats per floor to see the flats.'}
          </Text>
        </Card>

        <Button title="Create society" onPress={submit} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  info: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: spacing.lg },
  section: { fontSize: 15, fontWeight: '600', color: colors.text, marginVertical: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  preview: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  previewText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
});
