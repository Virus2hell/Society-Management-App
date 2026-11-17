// Reusable button. variant: 'primary' | 'outline' | 'danger' | 'success'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Button({ title, onPress, variant = 'primary', loading, disabled, style, small }) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    success: { bg: colors.success, fg: colors.white, border: colors.success },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
    outline: { bg: colors.white, fg: colors.primary, border: colors.primary },
  }[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (pressed || isDisabled) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.text, small && styles.smallText, { color: palette.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { paddingVertical: 8, paddingHorizontal: spacing.md },
  text: { fontSize: 15, fontWeight: '600' },
  smallText: { fontSize: 13 },
});
