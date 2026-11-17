// Secretary posts a notice; every member gets a notification.
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import TextField from '../../components/TextField';
import { colors, spacing } from '../../theme';

export default function NewNotice() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!title.trim() || !body.trim()) return setError('Please add a title and message');
    setSaving(true);
    setError(null);
    try {
      await api.post('/notices', { title, body, important });
      if (router.canGoBack()) router.back();
      else router.replace('/secretary/notices');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} />
      <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Society AGM on Sunday" />
      <TextField label="Message" value={body} onChangeText={setBody} multiline placeholder="Write the details here" />
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Mark as important</Text>
          <Text style={styles.switchSub}>Highlighted at the top of the notice board</Text>
        </View>
        <Switch value={important} onValueChange={setImportant} trackColor={{ true: colors.primary }} />
      </View>
      <Button title="Post & notify everyone" onPress={submit} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  switchTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  switchSub: { fontSize: 13, color: colors.muted },
});
