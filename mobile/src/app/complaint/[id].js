// Complaint details: photo, description and status timeline.
// The secretary can move it to "In progress" or "Resolved" with a note.
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import { fileUrl } from '../../api/config';
import Button from '../../components/Button';
import Card from '../../components/Card';
import ErrorBanner from '../../components/ErrorBanner';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { colors, radius, spacing } from '../../theme';
import { formatDateTime } from '../../utils/format';

export default function ComplaintDetail() {
  const { id } = useLocalSearchParams();
  const { activeMembership } = useAuth();
  const { data: c, setData, loading, error } = useApi(`/complaints/${id}`);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(null);

  const updateStatus = async (status) => {
    setSaving(status);
    try {
      const { data } = await api.patch(`/complaints/${id}/status`, { status, note });
      setData(data);
      setNote('');
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Loader />;
  if (!c) return <ErrorBanner message={error || 'Complaint not found'} />;

  const isSecretary = activeMembership?.role === 'secretary';

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <Card>
        <View style={styles.row}>
          <Text style={styles.category}>{c.category} • Flat {c.flat}</Text>
          <StatusBadge status={c.status} />
        </View>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.desc}>{c.description}</Text>
        {c.photoUrl && <Image source={{ uri: fileUrl(c.photoUrl) }} style={styles.photo} />}
        <Text style={styles.meta}>Complaint #{c.id} by {c.raisedByName}</Text>
      </Card>

      <Text style={styles.section}>Updates</Text>
      <Card>
        {c.history.map((h, i) => (
          <View key={i} style={styles.step}>
            <View style={[styles.dot, i === c.history.length - 1 && { backgroundColor: colors.primary }]} />
            <View style={{ flex: 1 }}>
              <StatusBadge status={h.status} />
              {h.note ? <Text style={styles.note}>{h.note}</Text> : null}
              <Text style={styles.meta}>{h.by} • {formatDateTime(h.at)}</Text>
            </View>
          </View>
        ))}
      </Card>

      {isSecretary && c.status !== 'resolved' && (
        <Card>
          <Text style={styles.sectionInCard}>Update status</Text>
          <TextField value={note} onChangeText={setNote} placeholder="Note for the resident (optional)" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {c.status === 'open' && (
              <Button title="In progress" variant="outline" style={{ flex: 1 }}
                loading={saving === 'in_progress'} onPress={() => updateStatus('in_progress')} />
            )}
            <Button title="Mark resolved" variant="success" style={{ flex: 1 }}
              loading={saving === 'resolved'} onPress={() => updateStatus('resolved')} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: 12, color: colors.primary, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  desc: { fontSize: 15, color: colors.text, marginTop: spacing.sm, lineHeight: 21 },
  photo: { width: '100%', height: 220, borderRadius: radius.md, marginTop: spacing.md, backgroundColor: colors.border },
  meta: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
  section: { fontSize: 15, fontWeight: '600', color: colors.text, marginVertical: spacing.sm },
  sectionInCard: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  step: { flexDirection: 'row', marginBottom: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border, marginTop: 6, marginRight: spacing.md },
  note: { fontSize: 14, color: colors.text, marginTop: 6 },
});
