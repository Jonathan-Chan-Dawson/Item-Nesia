import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, usePreventRemove } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Button,
  confirm,
  Copy,
  Empty,
  ErrorMessage,
  Field,
  Header,
  Screen,
  Section,
} from '../components/ui';
import { PhotoPicker } from '../components/PhotoPicker';
import { PlacePicker } from '../components/PlacePicker';
import { useMemory } from '../hooks/useMemory';
import { categories, type ItemDraft } from '../types/models';
import { persistPhoto, removePhoto } from '../services/photos';

export function ItemForm({ id, move }: { id?: string; move?: boolean }) {
  const { data, repository } = useMemory();
  const item = data.items.find((i) => i.id === id);
  const [initial] = useState<ItemDraft>(() =>
    item
      ? {
          name: item.name,
          description: item.description,
          category: item.category,
          aliases: item.aliases,
          tags: item.tags,
          photoUri: item.photoUri,
          locationPhotoUri: item.locationPhotoUri,
          placeId: item.placeId,
          exactSpot: item.exactSpot,
        }
      : { name: '', aliases: [], tags: [] },
  );
  const [draft, setDraft] = useState<ItemDraft>(initial);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const saving = useRef(false);
  const [allowLeave, setAllowLeave] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  usePreventRemove(dirty && !allowLeave, ({ repeat }) => {
    if (saving.current) return;
    void confirm(
      'Leave this memory?',
      'Your unsaved changes will be discarded.',
    ).then((leave) => {
      if (leave) {
        setAllowLeave(true);
        repeat();
      }
    });
  });
  const change = (patch: Partial<ItemDraft>) =>
    setDraft((previous) => ({ ...previous, ...patch }));
  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(undefined);
    const copied: string[] = [];
    try {
      if (!draft.name.trim()) throw new Error('Give your item a name.');
      if (!draft.placeId && !draft.exactSpot?.trim())
        throw new Error('Choose a place or describe the exact spot.');
      const durable = { ...draft };
      for (const key of ['photoUri', 'locationPhotoUri'] as const) {
        if (draft[key]) {
          durable[key] = await persistPhoto(draft[key]);
          if (durable[key] !== draft[key]) copied.push(durable[key]!);
        }
      }
      const savedId = await repository.saveItem(durable, id);
      setAllowLeave(true);
      setSaved(savedId);
      if (data.settings.hapticsEnabled)
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
    } catch (e) {
      await Promise.allSettled(copied.map(removePhoto));
      setError(
        e instanceof Error
          ? e.message
          : 'Your memory could not be saved. Check available storage and try again.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (id && !item)
    return (
      <Screen>
        <Header title="Item unavailable" />
        <Empty
          title="This memory isn’t here."
          message="It may have been deleted."
        />
      </Screen>
    );
  if (saved)
    return (
      <Screen>
        <Header title="Memory saved" />
        <Empty
          title="Future you says thanks."
          message="Your item and its last saved location are safely recorded."
        />
        <Button
          title="View Item"
          onPress={() =>
            router.replace({ pathname: '/items/[id]', params: { id: saved } })
          }
        />
        <Button
          secondary
          title="Back home"
          onPress={() => router.replace('/')}
        />
      </Screen>
    );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <Header
          title={move ? 'Move Item' : id ? 'Edit Item' : 'Remember an Item'}
        />
        {move ? (
          <Copy title>{draft.name}</Copy>
        ) : (
          <>
            <PhotoPicker
              label="The item"
              uri={draft.photoUri}
              onChange={(photoUri) => change({ photoUri })}
            />
            <Field
              label="Item name *"
              placeholder="e.g. Spare Charger"
              value={draft.name}
              onChangeText={(name) => change({ name })}
            />
            <Button
              title={more ? 'Less detail' : 'More details'}
              secondary
              icon={more ? 'chevron-up' : 'chevron-down'}
              onPress={() => setMore(!more)}
            />
            {more && (
              <>
                <Field
                  label="Description"
                  value={draft.description ?? ''}
                  onChangeText={(description) => change({ description })}
                  multiline
                />
                <Copy>Category</Copy>
                <View style={{ gap: 8 }}>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      title={category}
                      secondary={draft.category !== category}
                      onPress={() => change({ category })}
                    />
                  ))}
                </View>
                <Field
                  label="Tags (comma separated)"
                  value={draft.tags.join(',')}
                  onChangeText={(text) => change({ tags: text.split(',') })}
                />
                <Field
                  label="Other names (comma separated)"
                  value={draft.aliases.join(',')}
                  onChangeText={(text) => change({ aliases: text.split(',') })}
                />
              </>
            )}
          </>
        )}
        <Section title="Where did you put it?" />
        <PlacePicker
          value={draft.placeId}
          onChange={(placeId) => change({ placeId })}
        />
        <Field
          label="Exact spot"
          placeholder="Top drawer, behind the shirts"
          value={draft.exactSpot ?? ''}
          onChangeText={(exactSpot) => change({ exactSpot })}
          multiline
        />
        <PhotoPicker
          label="Photo of the hiding spot · optional"
          uri={draft.locationPhotoUri}
          onChange={(locationPhotoUri) => change({ locationPhotoUri })}
        />
        <ErrorMessage message={error} />
        <Button
          title={move ? 'Save Location' : 'Save to Memory'}
          busy={busy}
          icon="checkmark"
          onPress={() => {
            void save();
          }}
        />
        <Copy muted style={{ fontSize: 12 }}>
          This records where you put it. It isn’t live tracking.
        </Copy>
      </Screen>
    </KeyboardAvoidingView>
  );
}
