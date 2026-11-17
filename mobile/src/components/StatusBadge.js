// Small colored pill that shows a status like "Pending", "Paid", "Resolved".
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const STYLES = {
  pending: { bg: colors.warningLight, fg: colors.warning, label: 'Waiting' },
  approved: { bg: colors.primaryLight, fg: colors.primary, label: 'Approved' },
  denied: { bg: colors.dangerLight, fg: colors.danger, label: 'Denied' },
  inside: { bg: colors.successLight, fg: colors.success, label: 'Inside' },
  exited: { bg: '#F3F4F6', fg: colors.muted, label: 'Exited' },
  paid: { bg: colors.successLight, fg: colors.success, label: 'Paid' },
  unpaid: { bg: colors.dangerLight, fg: colors.danger, label: 'Unpaid' },
  open: { bg: colors.dangerLight, fg: colors.danger, label: 'Open' },
  in_progress: { bg: colors.warningLight, fg: colors.warning, label: 'In progress' },
  resolved: { bg: colors.successLight, fg: colors.success, label: 'Resolved' },
  rejected: { bg: colors.dangerLight, fg: colors.danger, label: 'Rejected' },
  removed: { bg: colors.dangerLight, fg: colors.danger, label: 'Removed' },
  member: { bg: colors.successLight, fg: colors.success, label: 'Member' },
};

export default function StatusBadge({ status, label }) {
  const s = STYLES[status] || { bg: '#F3F4F6', fg: colors.muted, label: status };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{label || s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});
