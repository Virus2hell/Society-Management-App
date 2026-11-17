// Join a society in two steps:
//   1. enter the 6-digit code -> we show which society it is
//   2. choose Resident (and pick your flat) or Watchman -> request is sent
// The secretary gets a notification and approves or rejects.
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ErrorBanner from '../../components/ErrorBanner';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

const ROLES = { Resident: 'resident', Watchman: 'watchman' };

export default function JoinSociety() {
  const { user, refresh } = useAuth();
  const [code, setCode] = useState('');
  const [society, setSociety] = useState(null); // result of the code lookup
  const [roleLabel, setRoleLabel] = useState('Resident');
  const [flat, setFlat] = useState('');
  const [flatSearch, setFlatSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const findSociety = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.get(`/societies/lookup/${code}`);
      setSociety(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const sendRequest = async () => {
    const role = ROLES[roleLabel];
    if (role === 'resident' && !flat) return setError('Select your flat');
    setBusy(true);
    setError(null);
    try {
      await api.post('/societies/join', { code, role, flat: role === 'resident' ? flat : undefined });
      await refresh();
      // back to "My societies", which shows the pending request
      if (router.canGoBack()) router.back();
      else router.replace('/societies');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const flats = (society?.flats || []).filter((f) => f.toLowerCase().includes(flatSearch.trim().toLowerCase()));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />

        {!society ? (
          <>
            <Text style={styles.info}>Enter the 6-digit code your society secretary shared with you.</Text>
            <TextField
              label="Society code"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="e.g. 482913"
              style={{ marginBottom: spacing.lg }}
            />
            <Button title="Find society" onPress={findSociety} loading={busy} disabled={code.length !== 6} />
          </>
        ) : (
          <>
            <Card style={styles.society}>
              <Text style={styles.joining}>You are joining</Text>
              <Text style={styles.name}>{society.name}</Text>
              <Text style={styles.meta}>{[society.address, society.city].filter(Boolean).join(', ')}</Text>
              <Text style={styles.change} onPress={() => { setSociety(null); setFlat(''); }}>Wrong society? Change code</Text>
            </Card>

            <Card>
              <Text style={styles.meta}>Name: <Text style={styles.strong}>{user?.name}</Text></Text>
              <Text style={styles.meta}>Email: <Text style={styles.strong}>{user?.email}</Text></Text>
            </Card>

            <OptionPicker label="I am a" options={Object.keys(ROLES)} value={roleLabel} onChange={setRoleLabel} />

            {roleLabel === 'Resident' && (
              <>
                {society.flats.length > 24 && (
                  <TextField label="Search your flat" value={flatSearch} onChangeText={setFlatSearch} autoCapitalize="characters" placeholder="e.g. A-3" />
                )}
                <OptionPicker label={`Your flat${flat ? `: ${flat}` : ''}`} options={flats.slice(0, 120)} value={flat} onChange={setFlat} />
                {flats.length > 120 && <Text style={styles.meta}>Showing 120 of {flats.length}. Type to search.</Text>}
              </>
            )}

            <Button title="Send join request" onPress={sendRequest} loading={busy} style={{ marginTop: spacing.md }} />
            <Text style={styles.note}>The secretary will approve your request. You'll get a notification.</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  info: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: spacing.lg },
  society: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  joining: { fontSize: 12, color: colors.primary, fontWeight: '600', textTransform: 'uppercase' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 4 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  strong: { color: colors.text, fontWeight: '600' },
  change: { color: colors.primary, marginTop: spacing.md, fontWeight: '500' },
  note: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: spacing.md },
});
