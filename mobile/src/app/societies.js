// "My societies" hub. Shows every society the user belongs to or asked to join:
//   approved -> tap to open (switches the app to that society)
//   pending  -> "waiting for secretary approval" (auto-refreshes) + cancel
//   rejected / removed -> dismiss or ask again
// Plus buttons to join a society with a code or create a new one.
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import HeaderActions from '../components/HeaderActions';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

const ROLE_LABEL = { secretary: 'Secretary', resident: 'Resident', watchman: 'Watchman' };

export default function SocietiesScreen() {
  const { user, memberships, activeMembership, refresh, selectSociety } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const hasPending = memberships.some((m) => m.status === 'pending');
  const userId = user?.id;

  // Logout/bell in the header (this screen is outside the tabs)
  // No back arrow when the user is not inside any society yet (nothing to go back to)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderActions showSwitch={false} />,
      headerBackVisible: !!activeMembership,
      headerLeft: activeMembership ? undefined : () => null,
    });
  }, [navigation, activeMembership]);

  // Refresh when opened, and every 5s while a request is pending
  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined;
      refresh().catch(() => {});
      if (!hasPending) return undefined;
      const timer = setInterval(() => refresh().catch(() => {}), 5000);
      return () => clearInterval(timer);
    }, [refresh, hasPending, userId])
  );

  if (!user) return <Redirect href="/login" />;

  const onPull = async () => {
    setRefreshing(true);
    await refresh().catch(() => {});
    setRefreshing(false);
  };

  const open = async (m) => {
    await selectSociety(m.societyId);
    if (router.canDismiss()) router.dismissAll();
    router.replace(`/${m.role}`);
  };

  const remove = (m, title, message) => {
    const run = async () => {
      try {
        await api.delete(`/societies/memberships/${m.id}`);
        await refresh();
      } catch (e) {
        Alert.alert('Error', errorMessage(e));
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) run();
      return;
    }
    Alert.alert(title, message, [{ text: 'No', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: run }]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPull} />}>
      <Text style={styles.hello}>Hi, {user?.name?.split(' ')[0]} 👋</Text>
      <Text style={styles.sub}>{memberships.length ? 'Your societies' : 'You are not part of any society yet.'}</Text>

      {memberships.map((m) => {
        const isCurrent = activeMembership?.id === m.id;
        const roleText = `${ROLE_LABEL[m.role]}${m.flat ? ` • Flat ${m.flat}` : ''}`;
        return (
          <Card key={m.id} style={isCurrent && styles.current} onPress={m.status === 'approved' ? () => open(m) : undefined}>
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name="business-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.society?.name}</Text>
                <Text style={styles.meta}>{[m.society?.address, m.society?.city].filter(Boolean).join(', ')}</Text>
                <Text style={styles.meta}>{roleText}</Text>
              </View>
              {m.status === 'approved' ? (
                isCurrent ? <StatusBadge status="approved" label="Current" /> : <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              ) : (
                <StatusBadge status={m.status} />
              )}
            </View>

            {m.status === 'pending' && (
              <View style={styles.pendingBox}>
                <Text style={styles.pendingText}>⏳ Waiting for the secretary to approve your request. You'll get a notification.</Text>
                <Button small variant="outline" title="Cancel request" style={{ marginTop: spacing.sm }}
                  onPress={() => remove(m, 'Cancel request?', `Stop asking to join ${m.society?.name}?`)} />
              </View>
            )}
            {(m.status === 'rejected' || m.status === 'removed') && (
              <View style={styles.actions}>
                <Button small variant="outline" title="Dismiss" style={{ flex: 1 }}
                  onPress={() => remove(m, 'Dismiss?', 'Hide this society from your list?')} />
                <Button small title="Ask again" style={{ flex: 1 }} onPress={() => router.push('/society/join')} />
              </View>
            )}
            {m.status === 'approved' && m.role !== 'secretary' && (
              <Text style={styles.leave} onPress={() => remove(m, 'Leave society?', `You will lose access to ${m.society?.name}.`)}>
                Leave society
              </Text>
            )}
          </Card>
        );
      })}

      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Resident or watchman?</Text>
        <Text style={styles.ctaText}>Ask your secretary for the 6-digit society code.</Text>
        <Button title="Join a society with code" onPress={() => router.push('/society/join')} />
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Secretary / committee member?</Text>
        <Text style={styles.ctaText}>Register your society and invite members with a code.</Text>
        <Button title="Create a new society" variant="outline" onPress={() => router.push('/society/create')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: 40 },
  hello: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginBottom: spacing.lg },
  current: { borderColor: colors.primary, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  pendingBox: { marginTop: spacing.md, backgroundColor: colors.warningLight, padding: spacing.md, borderRadius: radius.md },
  pendingText: { fontSize: 13, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  leave: { color: colors.danger, fontSize: 13, marginTop: spacing.md, fontWeight: '500' },
  cta: {
    marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.card,
  },
  ctaTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  ctaText: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: spacing.md },
});
