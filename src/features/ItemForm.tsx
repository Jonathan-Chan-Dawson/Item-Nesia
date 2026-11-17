import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
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
import { useMemory, useTheme } from '../hooks/useMemory';
import { categories, type ItemDraft } from '../types/models';
import { persistPhoto, removePhoto } from '../services/photos';
import { placePath } from '../utils/memory';
import { FolderPicker } from '../components/FolderPicker';
import { LocationPhoto } from '../components/LocationPhoto';

export function ItemForm({
  id,
  move,
  folderId,
  placeId,
}: {
  id?: string;
  move?: boolean;
  folderId?: string;
  placeId?: string;
}) {
  const { data, repository } = useMemory();
  const { colors } = useTheme();
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
          folderId: item.folderId,
          locationPinX: item.locationPinX,
          locationPinY: item.locationPinY,
        }
      : { name: '', aliases: [], tags: [], folderId, placeId },
  );
  const [draft, setDraft] = useState<ItemDraft>(initial);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [repeat, setRepeat] = useState(false);
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
        <Header title={move ? 'Location updated' : 'Item saved'} />
        <Empty
          title={move ? 'New location recorded.' : 'Future you says thanks.'}
          message={
            move
              ? `Last saved location: ${[placePath(draft.placeId, data.places), draft.exactSpot].filter(Boolean).join(' · ')}`
              : 'Your item and its last saved location are safely recorded.'
          }
        />
        <Button
          title="View Item"
          onPress={() =>
            router.replace({ pathname: '/items/[id]', params: { id: saved } })
          }
        />
        {!id && (
          <Button
            secondary
            title="Remember another here"
            onPress={() => {
              setDraft({
                name: '',
                aliases: [],
                tags: [],
                placeId: draft.placeId,
                exactSpot: draft.placeId ? undefined : draft.exactSpot,
                folderId: draft.folderId,
              });
              setSaved(undefined);
              setRepeat(true);
              setAllowLeave(false);
              setMore(false);
            }}
          />
        )}
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
          <>
            <Copy title>{draft.name}</Copy>
            <Copy muted style={{ fontSize: 13 }}>
              Current location:{' '}
              {[placePath(item?.placeId, data.places), item?.exactSpot]
                .filter(Boolean)
                .join(' · ')}
              . Update this after physically moving the item.
            </Copy>
          </>
        ) : (
          <>
            <PhotoPicker
              label="The item"
              uri={draft.photoUri}
              onChange={(photoUri) => change({ photoUri })}
            />
            <Field
              label="Item name *"
              autoFocus={repeat}
              placeholder="e.g. Spare Charger"
              value={draft.name}
              onChangeText={(name) => change({ name })}
            />
          </>
        )}
        <Section title="Where it is" />
        {!id && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              ...new Set(
                data.items
                  .filter((i) => !i.isArchived && i.placeId)
                  .sort((a, b) =>
                    b.locationUpdatedAt.localeCompare(a.locationUpdatedAt),
                  )
                  .map((i) => i.placeId!),
              ),
            ]
              .slice(0, 3)
              .map((placeId) => (
                <Button
                  key={placeId}
                  secondary
                  title={placePath(placeId, data.places) || 'Place'}
                  onPress={() => change({ placeId })}
                />
              ))}
          </View>
        )}
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
          onChange={(locationPhotoUri) =>
            change({
              locationPhotoUri,
              locationPinX: undefined,
              locationPinY: undefined,
            })
          }
        >
          {draft.locationPhotoUri && (
            <LocationPhoto
              key={draft.locationPhotoUri}
              uri={draft.locationPhotoUri}
              x={draft.locationPinX}
              y={draft.locationPinY}
              onChange={(point) =>
                change({ locationPinX: point?.x, locationPinY: point?.y })
              }
            />
          )}
        </PhotoPicker>
        {!move && (
          <>
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
                <FolderPicker
                  value={draft.folderId}
                  onChange={(folderId) => change({ folderId })}
                />
                <Copy>Category · optional</Copy>
                <View
                  style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}
                >
                  {categories.map((category) => (
                    <Pressable
                      key={category}
                      accessibilityRole="button"
                      accessibilityLabel={category}
                      accessibilityState={{
                        selected: draft.category === category,
                      }}
                      onPress={() =>
                        change({
                          category:
                            draft.category === category ? undefined : category,
                        })
                      }
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        minHeight: 44,
                        justifyContent: 'center',
                        borderRadius: 12,
                        backgroundColor:
                          draft.category === category
                            ? colors.primary
                            : colors.surface,
                        borderWidth: 1,
                        borderColor:
                          draft.category === category
                            ? colors.primary
                            : colors.border,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Copy
                        style={{
                          fontSize: 13,
                          color:
                            draft.category === category
                              ? colors.onPrimary
                              : colors.secondary,
                        }}
                      >
                        {category}
                      </Copy>
                    </Pressable>
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
