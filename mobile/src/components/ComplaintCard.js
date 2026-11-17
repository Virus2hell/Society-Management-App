// One complaint row; tapping opens the detail screen.
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { timeAgo } from '../utils/format';
import Card from './Card';
import StatusBadge from './StatusBadge';

export default function ComplaintCard({ complaint, showFlat }) {
  const c = complaint;
  return (
    <Card onPress={() => router.push(`/complaint/${c.id}`)}>
      <View style={styles.row}>
        <Text style={styles.category}>{c.category}{showFlat ? ` • ${c.flat}` : ''}</Text>
        <StatusBadge status={c.status} />
      </View>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.desc} numberOfLines={2}>{c.description}</Text>
      <Text style={styles.meta}>
        #{c.id} • {c.raisedByName} • {timeAgo(c.createdAt)}{c.photoUrl ? ' • 📷 photo' : ''}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: 12, color: colors.primary, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  desc: { fontSize: 14, color: colors.muted, marginTop: 4 },
  meta: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
});
