// Full-screen spinner.
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme';

export default function Loader() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
