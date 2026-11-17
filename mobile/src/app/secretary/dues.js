// Secretary maintenance: generate monthly bills for all flats, see who paid,
// and record cash/cheque payments.
import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ErrorBanner from '../../components/ErrorBanner';
import Loader from '../../components/Loader';
import OptionPicker from '../../components/OptionPicker';
import StatusBadge from '../../components/StatusBadge';
import TextField from '../../components/TextField';
import { useApi } from '../../hooks/useApi';
import { colors, spacing } from '../../theme';
import { currentMonth, formatDateTime, formatMoney, formatMonth } from '../../utils/format';

function nextMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

export default function SecretaryDues() {
  const { data, loading, refreshing, error, refresh, reload } = useApi('/bills', { initial: [] });
  const months = useMemo(() => [...new Set(data.map((b) => b.month))], [data]);
  const [month, setMonth] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => {
    const m = nextMonth(currentMonth());
    return { month: m, amount: '2500', dueDate: `${m}-10` };
  });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const selected = month || months[0];
  const bills = data.filter((b) => b.month === selected);
  const collected = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.amount, 0);
  const pending = bills.filter((b) => b.status === 'unpaid').reduce((s, b) => s + b.amount, 0);

  const generate = async () => {
    setSaving(true);
    try {
      const { data: res } = await api.post('/bills/generate', { ...form, amount: Number(form.amount) });
      Alert.alert('Bills generated', `${res.created} new bills created${res.skipped ? `, ${res.skipped} already existed` : ''}. Residents have been notified.`);
      setShowForm(false);
      setMonth(form.month);
      await reload();
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const recordCash = (bill) => {
    Alert.alert('Record payment', `Mark ${bill.flat} ${formatMonth(bill.month)} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      ...['Cash', 'Cheque'].map((method) => ({
        text: method,
        onPress: async () => {
          setBusyId(bill.id);
          try {
            await api.post(`/bills/${bill.id}/pay`, { method });
            await reload();
          } catch (e) {
            Alert.alert('Error', errorMessage(e));
          } finally {
            setBusyId(null);
          }
        },
      })),
    ]);
  };

  if (loading) return <Loader />;

  return (
    <FlatList
      data={bills}
      keyExtractor={(b) => String(b.id)}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View>
          <ErrorBanner message={error} />
          {showForm ? (
            <Card>
              <Text style={styles.cardTitle}>Generate bills for all flats</Text>
              <TextField label="Month (YYYY-MM)" value={form.month} onChangeText={(v) => setForm((f) => ({ ...f, month: v }))} />
              <TextField label="Amount per flat (₹)" value={form.amount} keyboardType="number-pad" onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))} />
              <TextField label="Due date (YYYY-MM-DD)" value={form.dueDate} onChangeText={(v) => setForm((f) => ({ ...f, dueDate: v }))} />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="Cancel" variant="outline" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
                <Button title="Generate" onPress={generate} loading={saving} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : (
            <Button title="+ Generate monthly bills" onPress={() => setShowForm(true)} style={{ marginBottom: spacing.md }} />
          )}

          {months.length > 0 && (
            <OptionPicker options={months} value={selected} onChange={setMonth} wrap={false} />
          )}
          {selected && (
            <View style={styles.summaryRow}>
              <Card style={styles.summary}>
                <Text style={styles.label}>Collected</Text>
                <Text style={[styles.value, { color: colors.success }]}>{formatMoney(collected)}</Text>
              </Card>
              <Card style={styles.summary}>
                <Text style={styles.label}>Pending</Text>
                <Text style={[styles.value, { color: colors.danger }]}>{formatMoney(pending)}</Text>
              </Card>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={<EmptyState icon="wallet-outline" title="No bills" message="Generate this month's bills to start collecting maintenance." />}
      renderItem={({ item: b }) => (
        <Card>
          <View style={styles.row}>
            <Text style={styles.flat}>{b.flat}</Text>
            <StatusBadge status={b.status} />
          </View>
          <Text style={styles.meta}>
            {formatMoney(b.amount)} • {b.status === 'paid' ? `${b.paymentMethod} on ${formatDateTime(b.paidAt)}` : `due ${b.dueDate}`}
          </Text>
          {b.status === 'unpaid' && (
            <Button small variant="outline" title="Record cash / cheque payment" style={{ marginTop: spacing.md }}
              loading={busyId === b.id} onPress={() => recordCash(b)} />
          )}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.md },
  summary: { flex: 1 },
  label: { fontSize: 13, color: colors.muted },
  value: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flat: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
});
