import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Button, Copy, ErrorMessage, Icon } from './ui';
import { useTheme } from '../hooks/useMemory';

export function PhotoPicker({
  uri,
  onChange,
  label,
}: {
  uri?: string;
  onChange(uri?: string): void;
  label: string;
}) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { colors } = useTheme();
  async function pick(camera: boolean) {
    setError(undefined);
    setBusy(true);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error(
            'Camera access is off. Enable it in your device settings, or choose a photo instead.',
          );
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.7,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) onChange(result.assets[0].uri);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'This photo could not be opened.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Copy style={{ fontWeight: '600' }}>{label}</Copy>
      <View
        style={{
          height: uri ? 220 : 120,
          backgroundColor: colors.soft,
          borderRadius: 22,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            contentFit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <>
            <Icon name="camera-outline" size={32} />
            <Copy muted style={{ fontSize: 12 }}>
              A little visual reminder. Optional.
            </Copy>
          </>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            title="Take photo"
            secondary
            icon="camera-outline"
            disabled={busy}
            onPress={() => {
              void pick(true);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Choose"
            secondary
            icon="image-outline"
            disabled={busy}
            onPress={() => {
              void pick(false);
            }}
          />
        </View>
      </View>
      {uri && (
        <Button
          title="Remove photo"
          secondary
          onPress={() => onChange(undefined)}
        />
      )}
      <ErrorMessage message={error} />
    </View>
  );
}
