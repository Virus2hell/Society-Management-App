// Resident invites a guest in advance. The API returns a 6-digit code,
// and we open the QR pass screen so it can be shared with the guest.
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import { spacing } from '../../theme';
import { formatDate, toISODate } from '../../utils/format';

const PURPOSES = ['Guest', 'Delivery', 'Cab', 'Service'];

// Next 7 days as chips: "Today", "Tomorrow", "19 Nov 2026" ...
const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const iso = toISODate(d);
  return { iso, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatDate(iso) };
});

export default function PreapproveGuest() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('Guest');
  const [dayLabel, setDayLabel] = useState('Today');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!name.trim()) return setError('Enter the guest name');
    setSaving(true);
    setError(null);
    try {
      const validDate = DAYS.find((d) => d.label === dayLabel).iso;
      const { data } = await api.post('/visitors/preapprove', { name, phone, purpose, validDate });
      router.replace(`/visitor/pass/${data.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} />
      <TextField label="Guest name" value={name} onChangeText={setName} placeholder="e.g. Neha Kulkarni" />
      <TextField label="Guest phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
      <OptionPicker label="Purpose" options={PURPOSES} value={purpose} onChange={setPurpose} />
      <OptionPicker label="Visiting on" options={DAYS.map((d) => d.label)} value={dayLabel} onChange={setDayLabel} />
      <Button title="Create gate pass" onPress={submit} loading={saving} />
    </ScrollView>
  );
}
