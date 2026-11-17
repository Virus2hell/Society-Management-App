// Two-line header title: screen name + current society name below it.
import { Text, View } from 'react-native';
import { colors } from '../theme';

export default function HeaderTitle({ title, subtitle }) {
  return (
    <View>
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
