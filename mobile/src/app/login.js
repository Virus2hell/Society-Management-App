// Login with email + password. Includes one-tap demo logins (demo society code 123456).
import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorMessage } from '../api/client';
import { API_URL } from '../api/config';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

const DEMO_PASSWORD = '123456';
const DEMO_USERS = [
  { label: 'Resident', email: 'priya@demo.com', icon: 'home-outline' },
  { label: 'Watchman', email: 'watchman@demo.com', icon: 'shield-outline' },
  { label: 'Secretary', email: 'secretary@demo.com', icon: 'briefcase-outline' },
];

export default function LoginScreen() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (user) return <Redirect href="/" />;

  const doLogin = async (e = email, pw = password) => {
    if (!e || !pw) return setError('Enter your email and password');
    setLoading(true);
    setError(null);
    try {
      await login(e.trim(), pw);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Ionicons name="business" size={36} color={colors.white} />
          </View>
          <Text style={styles.title}>Society Manager</Text>
          <Text style={styles.subtitle}>Visitors, dues, complaints and notices for any housing society</Text>

          <ErrorBanner message={error} />
          <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" onSubmitEditing={() => doLogin()} />
          <Button title="Log in" onPress={() => doLogin()} loading={loading} />

          <Text style={styles.link}>
            New here? <Link href="/signup" style={styles.linkStrong}>Create an account</Link>
          </Text>

          <Text style={styles.demoTitle}>Quick demo login (society code 123456)</Text>
          <View style={styles.demoRow}>
            {DEMO_USERS.map((d) => (
              <Pressable key={d.email} style={styles.demo} onPress={() => doLogin(d.email, DEMO_PASSWORD)} disabled={loading}>
                <Ionicons name={d.icon} size={20} color={colors.primary} />
                <Text style={styles.demoText}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.server}>Server: {API_URL}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingTop: 48 },
  logo: {
    width: 68, height: 68, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.lg,
  },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: spacing.xl },
  link: { textAlign: 'center', marginTop: spacing.lg, color: colors.muted },
  linkStrong: { color: colors.primary, fontWeight: '600' },
  demoTitle: { marginTop: 36, marginBottom: spacing.sm, color: colors.muted, fontSize: 13, textAlign: 'center' },
  demoRow: { flexDirection: 'row', gap: spacing.sm },
  demo: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  demoText: { marginTop: 4, fontSize: 13, color: colors.text, fontWeight: '500' },
  server: { marginTop: spacing.xl, textAlign: 'center', fontSize: 11, color: colors.muted },
});
