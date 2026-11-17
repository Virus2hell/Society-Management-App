// Resident maintenance bills: pay (demo payment) and download/share a PDF receipt.
import { useState } from 'react';
import { Alert, FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { colors, spacing } from '../../theme';
import { formatDate, formatDateTime, formatMoney, formatMonth, toISODate } from '../../utils/format';
import { shareReceipt } from '../../utils/receipt';

export default function ResidentDues() {
  const { user, activeMembership } = useAuth();
  const myFlat = activeMembership?.flat;
  const { data, loading, refreshing, error, refresh, reload } = useApi('/bills', { initial: [] });
  const { data: society } = useApi('/society');
  const [busyId, setBusyId] = useState(null);

  const pay = async (bill, method) => {
    setBusyId(bill.id);
    try {
      const { data: paid } = await api.post(`/bills/${bill.id}/pay`, { method });
      await reload();
      Alert.alert('Payment successful', `${formatMoney(paid.amount)} paid. Ref: ${paid.paymentRef}`, [
        { text: 'OK' },
        { text: 'Get receipt', onPress: () => receipt(paid) },
      ]);
    } catch (e) {
      Alert.alert('Payment failed', errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  // Demo payment: in a real app you'd open Razorpay / UPI intent here
  const askPayment = (bill) => {
    if (Platform.OS === 'web') return pay(bill, 'UPI');
    Alert.alert(`Pay ${formatMoney(bill.amount)}`, `Maintenance for ${formatMonth(bill.month)} (demo payment)`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'UPI', onPress: () => pay(bill, 'UPI') },
      { text: 'Card', onPress: () => pay(bill, 'Card') },
    ]);
  };

  const receipt = async (bill) => {
    try {
      await shareReceipt(bill, user, society?.name);
    } catch (e) {
      Alert.alert('Could not create receipt', e.message);
    }
  };

  if (loading) return <Loader />;

  const totalDue = data.filter((b) => b.status === 'unpaid').reduce((s, b) => s + b.amount, 0);
  const today = toISODate();

  return (
    <FlatList
      data={data}
      keyExtractor={(b) => String(b.id)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View>
          <ErrorBanner message={error} />
          <Card style={styles.summary}>
            <Text style={styles.summaryLabel}>Total outstanding for {myFlat}</Text>
            <Text style={[styles.summaryValue, { color: totalDue ? colors.danger : colors.success }]}>
              {formatMoney(totalDue)}
            </Text>
            <Text style={styles.summaryLabel}>{totalDue ? 'Please pay before the due date' : 'All clear, thank you! 🎉'}</Text>
          </Card>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="wallet-outline" title="No bills yet" />}
      renderItem={({ item: b }) => {
        const overdue = b.status === 'unpaid' && b.dueDate < today;
        return (
          <Card>
            <View style={styles.row}>
              <Text style={styles.month}>{formatMonth(b.month)}</Text>
              <StatusBadge status={overdue ? 'denied' : b.status} label={overdue ? 'Overdue' : undefined} />
            </View>
            <Text style={styles.amount}>{formatMoney(b.amount)}</Text>
            <Text style={styles.meta}>
              {b.status === 'paid'
                ? `Paid ${formatDateTime(b.paidAt)} via ${b.paymentMethod} • ${b.paymentRef}`
                : `Due by ${formatDate(b.dueDate)}`}
            </Text>
            <View style={{ marginTop: spacing.md }}>
              {b.status === 'paid' ? (
                <Button small variant="outline" title="Download receipt (PDF)" onPress={() => receipt(b)} />
              ) : (
                <Button small title="Pay now" loading={busyId === b.id} onPress={() => askPayment(b)} />
              )}
            </View>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  summary: { alignItems: 'center', paddingVertical: spacing.xl },
  summaryLabel: { fontSize: 13, color: colors.muted },
  summaryValue: { fontSize: 32, fontWeight: '700', marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  month: { fontSize: 16, fontWeight: '600', color: colors.text },
  amount: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
});
