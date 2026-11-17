// Shows the QR gate pass for a pre-approved guest. The watchman scans this
// QR (or types the 6-digit code) at the gate.
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import ErrorBanner from '../../../components/ErrorBanner';
import Loader from '../../../components/Loader';
import StatusBadge from '../../../components/StatusBadge';
import { useApi } from '../../../hooks/useApi';
import { colors, spacing } from '../../../theme';
import { formatDate, formatDateTime } from '../../../utils/format';

export default function GatePass() {
  const { id } = useLocalSearchParams();
  const { data: v, loading, error } = useApi(`/visitors/${id}`, { pollMs: 10000 });
  const { data: society } = useApi('/society');

  if (loading) return <Loader />;
  if (!v) return <ErrorBanner message={error || 'Pass not found'} />;

  const share = () =>
    Share.share({
      message:
        `Hi ${v.name}, here is your gate pass for ${society?.name || 'our society'} (Flat ${v.flat}).\n` +
        `Date: ${formatDate(v.validDate)}\nGate pass code: ${v.code}\n` +
        `Show this code to the security guard at the gate.`,
    });

  const usable = v.status === 'approved';

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <Card style={styles.pass}>
        <Text style={styles.society}>{society?.name}</Text>
        <Text style={styles.title}>Gate Pass</Text>
        <View style={[styles.qrBox, !usable && { opacity: 0.25 }]}>
          <QRCode value={`SOCIETYPASS:${v.code}`} size={210} />
        </View>
        <Text style={styles.code}>{v.code}</Text>
        <StatusBadge status={v.status} label={usable ? 'Valid' : undefined} />

        <View style={styles.details}>
          <Row label="Guest" value={v.name} />
          <Row label="Purpose" value={v.purpose} />
          <Row label="Flat" value={v.flat} />
          <Row label="Valid on" value={formatDate(v.validDate)} />
          {v.entryAt && <Row label="Entered" value={formatDateTime(v.entryAt)} />}
          {v.exitAt && <Row label="Exited" value={formatDateTime(v.exitAt)} />}
        </View>
      </Card>
      {usable && <Button title="Share pass with guest" onPress={share} />}
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pass: { alignItems: 'center', paddingVertical: spacing.xl },
  society: { fontSize: 13, color: colors.muted },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  qrBox: { padding: spacing.md, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  code: { fontSize: 30, fontWeight: '700', letterSpacing: 6, color: colors.text, marginVertical: spacing.md },
  details: { alignSelf: 'stretch', marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
