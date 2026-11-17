// Shown when a list has nothing in it.
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export default function EmptyState({ icon = 'file-tray-outline', title, message }) {
  return (
    <View style={styles.box}>
      <Ionicons name={icon} size={44} color={colors.border} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.xl },
  title: { marginTop: spacing.md, fontSize: 16, fontWeight: '600', color: colors.text },
  message: { marginTop: 4, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
