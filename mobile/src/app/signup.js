// Create an account (name, email, password). After this the user lands on
// "My societies" where they create a society or join one with a code.
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { errorMessage } from '../api/client';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function SignupScreen() {
  const { user, signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (user) return <Redirect href="/" />;

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) return setError('Please fill all fields');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setLoading(true);
    setError(null);
    try {
      await signup({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.info}>
          One account works for every society. After signing up you can create a new society (if you are the secretary)
          or join yours with the 6-digit code from your secretary.
        </Text>
        <ErrorBanner message={error} />
        <TextField label="Full name" value={form.name} onChangeText={set('name')} placeholder="e.g. Priya Patil" autoComplete="name" />
        <TextField label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" />
        <TextField label="Password" value={form.password} onChangeText={set('password')} secureTextEntry placeholder="At least 6 characters" />
        <TextField label="Confirm password" value={form.confirm} onChangeText={set('confirm')} secureTextEntry placeholder="Type it again" />
        <Button title="Create account" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl },
  info: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: spacing.lg },
});
