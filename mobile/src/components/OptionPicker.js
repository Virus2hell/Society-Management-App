// A row of tappable chips to pick one option (flat, category, purpose...).
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export default function OptionPicker({ label, options, value, onChange, wrap = true }) {
  const chips = options.map((opt) => {
    const selected = opt === value;
    return (
      <Pressable
        key={opt}
        onPress={() => onChange(opt)}
        style={[styles.chip, selected && styles.chipSelected]}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt}</Text>
      </Pressable>
    );
  });

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {wrap ? (
        <View style={styles.wrap}>{chips}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>{chips}</ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6, fontWeight: '500' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextSelected: { color: colors.white, fontWeight: '600' },
});
