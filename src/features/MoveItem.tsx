import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router, usePreventRemove } from 'expo-router';
import { useMemory } from '../hooks/useMemory';
import {
  locationKey,
  locationSnapshot,
  snapshotLabel,
} from '../utils/locations';
import type { LocationSnapshot } from '../types/models';
import { persistPhoto, removePhoto } from '../services/photos';
import {
  Button,
  Copy,
  Empty,
  ErrorMessage,
  Header,
  Screen,
  confirm,
} from '../components/ui';
import { LocationEditor } from '../components/LocationEditor';
import { LocationSummary } from '../components/LocationSummary';
export function MoveItem({ id }: { id: string }) {
  const { data, repository } = useMemory();
  const item = data.items.find((item) => item.id === id);
  const [initial] = useState(() => ({
    location: item ? locationSnapshot(item, data.places) : { path: '' },
    updatedAt: item?.locationUpdatedAt ?? '',
  }));
  const [destination, setDestination] = useState<LocationSnapshot>(
    initial.location,
  );
  const [busy, setBusy] = useState(false),
    [allowLeave, setAllowLeave] = useState(false);
  const [result, setResult] = useState<{
    historyId?: string;
    changed: boolean;
  }>();
  const [error, setError] = useState<string>();
  const saving = useRef(false),
    navigated = useRef(false);
  const dirty = locationKey(destination) !== locationKey(initial.location);
  usePreventRemove(dirty && !allowLeave, ({ repeat }) => {
    if (saving.current) return;
    void confirm(
      'Discard location changes?',
      'Your saved location will stay the same.',
    ).then((yes) => {
      if (yes) {
        setAllowLeave(true);
        repeat();
      }
    });
  });
  useEffect(() => {
    if (result && !navigated.current) {
      navigated.current = true;
      router.replace({
        pathname: '/items/[id]',
        params: {
          id,
          moveId: result.historyId ?? '',
          moved: result.changed ? '1' : '0',
        },
      });
    }
  }, [result, id]);
  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(undefined);
    let copied: string | undefined;
    try {
      if (!destination.placeId && !destination.position?.trim())
        throw new Error('Choose a place or enter a position.');
      const durable = { ...destination };
      if (durable.photoUri) {
        const original = durable.photoUri;
        durable.photoUri = await persistPhoto(original);
        if (durable.photoUri !== original) copied = durable.photoUri;
      }
      const saved = await repository.moveItem(id, durable, {
        updatedAt: initial.updatedAt,
        key: locationKey(initial.location),
      });
      setAllowLeave(true);
      setResult(saved);
    } catch (e) {
      if (copied) await removePhoto(copied).catch(() => {});
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save the location. Try again.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (!item || item.deletedAt)
    return (
      <Screen>
        <Header title="Move item" />
        <Empty
          title="Item unavailable"
          message="Return to your items to choose another."
        />
      </Screen>
    );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Screen scroll={false}>
        <Header title="Move item" />
        <View style={{ gap: 8 }}>
          <Copy style={{ fontWeight: '700' }}>{item.name}</Copy>
          <LocationSummary label="From" snapshot={initial.location} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <LocationEditor
            value={destination}
            onChange={setDestination}
            item={item}
            shortcuts
          />
        </ScrollView>
        <View style={{ gap: 8 }}>
          <ErrorMessage message={error} />
          <Button
            title={
              destination.placeId || destination.position?.trim()
                ? `Save to ${snapshotLabel({ ...destination, path: locationSnapshot({ placeId: destination.placeId }, data.places).path })}`
                : 'Save location'
            }
            icon="checkmark"
            busy={busy}
            onPress={() => {
              void save();
            }}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
