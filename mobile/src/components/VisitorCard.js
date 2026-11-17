// One visitor row. `actions` lets each screen add its own buttons below.
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { formatDate, formatDateTime } from '../utils/format';
import Card from './Card';
import StatusBadge from './StatusBadge';

const PURPOSE_ICONS = { Guest: 'person-outline', Delivery: 'cube-outline', Cab: 'car-outline', Service: 'construct-outline' };

export default function VisitorCard({ visitor, actions, onPress, showFlat = true }) {
  const v = visitor;
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Ionicons name={PURPOSE_ICONS[v.purpose] || 'person-outline'} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{v.name}</Text>
          <Text style={styles.meta}>
            {v.purpose}{showFlat ? ` • ${v.flat}` : ''}{v.phone ? ` • ${v.phone}` : ''}
          </Text>
        </View>
        <StatusBadge status={v.status} />
      </View>

      <Text style={styles.time}>
        {v.type === 'preapproved' && v.status === 'approved'
          ? `Gate pass for ${formatDate(v.validDate)}`
          : v.exitAt
            ? `In ${formatDateTime(v.entryAt)} • Out ${formatDateTime(v.exitAt)}`
            : v.entryAt
              ? `Entered ${formatDateTime(v.entryAt)}`
              : `Arrived ${formatDateTime(v.createdAt)}`}
        {v.type === 'preapproved' ? '  •  QR pass' : ''}
      </Text>

      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  time: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
