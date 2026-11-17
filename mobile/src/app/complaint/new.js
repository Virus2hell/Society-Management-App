// Resident raises a complaint with an optional photo (camera or gallery).
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { errorMessage, uploadForm } from '../../api/client';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import { colors, radius, spacing } from '../../theme';

const CATEGORIES = ['Lift', 'Water', 'Electricity', 'Leakage', 'Cleaning', 'Security', 'Parking', 'Other'];

export default function NewComplaint() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Lift');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null); // ImagePicker asset
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const pickPhoto = async (fromCamera) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission needed', 'Please allow access to attach a photo.');

    const options = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) return setError('Please add a title and a description');
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('category', category);
      form.append('description', description);
      if (photo) {
        const name = photo.fileName || `photo-${Date.now()}.jpg`;
        const type = photo.mimeType || 'image/jpeg';
        if (Platform.OS === 'web') {
          const blob = await (await fetch(photo.uri)).blob();
          form.append('photo', blob, name);
        } else {
          form.append('photo', { uri: photo.uri, name, type });
        }
      }
      const created = await uploadForm('/complaints', form);
      router.replace(`/complaint/${created.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <ErrorBanner message={error} />
      <OptionPicker label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
      <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Lift stuck on 3rd floor" />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline placeholder="Explain the problem" />

      <Text style={styles.label}>Photo (optional)</Text>
      {photo ? (
        <View>
          <Image source={{ uri: photo.uri }} style={styles.preview} />
          <Pressable onPress={() => setPhoto(null)}><Text style={styles.remove}>Remove photo</Text></Pressable>
        </View>
      ) : (
        <View style={styles.photoRow}>
          {Platform.OS !== 'web' && (
            <Button small variant="outline" title="Take photo" onPress={() => pickPhoto(true)} style={{ flex: 1 }} />
          )}
          <Button small variant="outline" title="Choose from gallery" onPress={() => pickPhoto(false)} style={{ flex: 1 }} />
        </View>
      )}

      <Button title="Submit complaint" onPress={submit} loading={saving} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.muted, marginBottom: 6, fontWeight: '500' },
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  preview: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: colors.border },
  remove: { color: colors.danger, marginTop: spacing.sm, fontWeight: '500' },
});
