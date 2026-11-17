// Watchman scans the guest's QR gate pass (or types the 6-digit code).
// The API checks the pass is valid today and marks the guest "inside".
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import Button from '../../components/Button';
import Card from '../../components/Card';
import TextField from '../../components/TextField';
import { colors, radius, spacing } from '../../theme';

export default function ScanPass() {
  const isFocused = useIsFocused(); // only keep the camera on while this tab is open
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState(null); // { ok, visitor?, message }
  const [manualCode, setManualCode] = useState('');
  const [checking, setChecking] = useState(false);
  const lockRef = useRef(false); // the camera fires many times per second; handle one scan at a time

  const verify = async (code) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setChecking(true);
    try {
      const { data } = await api.post('/visitors/verify', { code });
      setResult({ ok: true, visitor: data, message: 'Entry allowed' });
    } catch (e) {
      setResult({ ok: false, message: errorMessage(e) });
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setResult(null);
    setManualCode('');
    lockRef.current = false;
  };

  const showCamera = Platform.OS !== 'web' && permission?.granted && isFocused && !result;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {result ? (
          <Card style={[styles.result, { borderColor: result.ok ? colors.success : colors.danger }]}>
            <Ionicons name={result.ok ? 'checkmark-circle' : 'close-circle'} size={64} color={result.ok ? colors.success : colors.danger} />
            <Text style={[styles.resultTitle, { color: result.ok ? colors.success : colors.danger }]}>
              {result.ok ? 'Entry allowed' : 'Not allowed'}
            </Text>
            {result.ok ? (
              <>
                <Text style={styles.guest}>{result.visitor.name}</Text>
                <Text style={styles.meta}>{result.visitor.purpose} • Flat {result.visitor.flat}</Text>
                <Text style={styles.meta}>Resident has been notified.</Text>
              </>
            ) : (
              <Text style={styles.meta}>{result.message}</Text>
            )}
            <Button title="Scan next pass" onPress={reset} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
          </Card>
        ) : (
          <>
            <View style={styles.cameraBox}>
              {showCamera ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={checking ? undefined : ({ data }) => verify(data)}
                />
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <Ionicons name="qr-code-outline" size={56} color={colors.muted} />
                  {Platform.OS === 'web' ? (
                    <Text style={styles.meta}>Camera scanning works in the mobile app. Use the code below.</Text>
                  ) : !permission?.granted ? (
                    <>
                      <Text style={styles.meta}>Camera permission is needed to scan passes.</Text>
                      <Button small title="Allow camera" onPress={requestPermission} style={{ marginTop: spacing.md }} />
                    </>
                  ) : null}
                </View>
              )}
              {showCamera && <View style={styles.frame} pointerEvents="none" />}
            </View>
            <Text style={styles.hint}>Point the camera at the guest's QR code</Text>

            <Card style={{ marginTop: spacing.lg }}>
              <Text style={styles.cardTitle}>Or enter the 6-digit code</Text>
              <TextField value={manualCode} onChangeText={setManualCode} keyboardType="number-pad" maxLength={6} placeholder="e.g. 482913" />
              <Button title="Verify code" loading={checking} disabled={manualCode.length !== 6} onPress={() => verify(manualCode)} />
            </Card>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  cameraBox: { height: 300, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  frame: {
    position: 'absolute', top: 50, left: '20%', right: '20%', bottom: 50,
    borderWidth: 3, borderColor: colors.white, borderRadius: radius.lg,
  },
  hint: { textAlign: 'center', color: colors.muted, marginTop: spacing.sm, fontSize: 13 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  result: { alignItems: 'center', paddingVertical: 32, borderWidth: 2 },
  resultTitle: { fontSize: 22, fontWeight: '700', marginTop: spacing.sm },
  guest: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  meta: { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'center' },
});
