import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import {
  Button,
  confirm,
  Copy,
  Empty,
  ErrorMessage,
  Header,
  Icon,
  Panel,
  Screen,
  Section,
  s,
} from '../../components/ui';
import { ItemPhoto } from '../../components/ItemCard';
import { useMemory, useTheme } from '../../hooks/useMemory';
import { ChoiceSheet } from '../../components/controls';
import { OverflowMenu } from '../../components/OverflowMenu';
import { LocationPhoto } from '../../components/LocationPhoto';
import { folderPath } from '../../utils/folders';
import { placePath } from '../../utils/memory';
export default function ItemDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, repository } = useMemory();
  const { colors } = useTheme();
  const [error, setError] = useState<string>();
  const [found, setFound] = useState(false);
  const [details, setDetails] = useState(false);
  const [filing, setFiling] = useState(false);
  const [notice, setNotice] = useState<string>();
  const item = data.items.find((i) => i.id === id);
  const run = (action: Promise<unknown>) => {
    setError(undefined);
    void action.catch((e) => setError(e.message));
  };
  if (!item)
    return (
      <Screen>
        <Header title="Item unavailable" />
        <Empty
          title="This item isn’t here."
          message="It may have been deleted."
        />
      </Screen>
    );
  return (
    <Screen>
      <Header
        title={item.name}
        right={
          <OverflowMenu
            title="Item"
            options={[
              { value: 'edit', label: 'Edit item', icon: 'create-outline' },
              { value: 'file', label: 'Change folder', icon: 'folder-outline' },
              {
                value: 'favorite',
                label: item.isFavorite ? 'Remove favorite' : 'Favorite item',
                icon: 'heart-outline',
              },
              {
                value: 'duplicate',
                label: 'Duplicate item',
                icon: 'copy-outline',
              },
              {
                value: 'archive',
                label: item.isArchived ? 'Restore item' : 'Archive item',
                icon: 'archive-outline',
              },
              { value: 'delete', label: 'Delete item', icon: 'trash-outline' },
            ]}
            onSelect={(value) => {
              if (value === 'edit')
                router.push({ pathname: '/items/edit/[id]', params: { id } });
              if (value === 'file') setFiling(true);
              if (value === 'favorite')
                run(
                  repository.updateItem(id, { isFavorite: !item.isFavorite }),
                );
              if (value === 'archive')
                run(
                  repository
                    .updateItem(id, { isArchived: !item.isArchived })
                    .then(() =>
                      setNotice(
                        item.isArchived
                          ? 'Item restored.'
                          : 'Archived. Open Filters → View → Archived in All Items to find it.',
                      ),
                    ),
                );
              if (value === 'duplicate')
                run(
                  repository.duplicateItem(id).then((newId) =>
                    router.push({
                      pathname: '/items/[id]',
                      params: { id: newId },
                    }),
                  ),
                );
              if (value === 'delete')
                void confirm(
                  `Delete ${item.name}?`,
                  'This removes the item and its location history.',
                ).then((yes) => {
                  if (yes)
                    run(
                      repository
                        .deleteItem(id)
                        .then(() => router.replace('/items')),
                    );
                });
            }}
          />
        }
      />
      <ItemPhoto item={item} height={220} />
      <View style={{ gap: 4 }}>
        <View style={s.row}>
          <Copy title style={{ flex: 1, fontSize: 27 }}>
            {item.name}
          </Copy>
          {item.isFavorite && <Icon name="heart" size={18} />}
        </View>
        {(item.isDemo || item.isArchived) && (
          <Copy muted style={{ fontSize: 12 }}>
            {[
              item.isDemo ? 'Demo item' : undefined,
              item.isArchived ? 'Archived' : undefined,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Copy>
        )}
      </View>
      <View
        style={{
          padding: 20,
          borderRadius: 22,
          backgroundColor: colors.soft,
          gap: 10,
        }}
      >
        <View style={[s.row, { justifyContent: 'flex-start', gap: 7 }]}>
          <Icon name="location-outline" size={16} />
          <Copy
            style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1,
              color: colors.primary,
            }}
          >
            LAST SAVED LOCATION
          </Copy>
        </View>
        <Copy title>
          {placePath(item.placeId, data.places) || 'Exact spot'}
        </Copy>
        {item.exactSpot && <Copy>{item.exactSpot}</Copy>}
        <Copy muted style={{ fontSize: 12 }}>
          Last recorded: {new Date(item.locationUpdatedAt).toLocaleDateString()}{' '}
          · Saved by you, not live tracking.
        </Copy>
        {item.placeId && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/places/[id]',
                params: { id: item.placeId },
              })
            }
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Copy
              style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}
            >
              Show everything stored here →
            </Copy>
          </Pressable>
        )}
      </View>
      {item.locationPhotoUri && (
        <LocationPhoto
          key={item.locationPhotoUri}
          uri={item.locationPhotoUri}
          x={item.locationPinX}
          y={item.locationPinY}
        />
      )}
      <ErrorMessage message={error} />
      {notice && <Copy>{notice}</Copy>}
      <Button
        title={found ? 'Found it? Nice.' : 'Found It'}
        icon="checkmark-circle-outline"
        onPress={() => setFound(true)}
      />
      {found && (
        <Panel>
          <Copy>Still in the same place?</Copy>
          <Button
            secondary
            title="Yes, same place"
            onPress={() => setFound(false)}
          />
          <Button
            secondary
            title="Move somewhere else"
            onPress={() =>
              router.push({ pathname: '/items/move/[id]', params: { id } })
            }
          />
        </Panel>
      )}
      <Button
        title="Move Item"
        secondary
        icon="swap-horizontal-outline"
        onPress={() =>
          router.push({ pathname: '/items/move/[id]', params: { id } })
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: details }}
        onPress={() => setDetails(!details)}
        style={[s.row, { minHeight: 48 }]}
      >
        <Copy style={{ fontWeight: '600' }}>Details & organization</Copy>
        <Icon name={details ? 'chevron-up' : 'chevron-down'} size={17} />
      </Pressable>
      {details && (
        <Panel>
          <Copy muted>Category: {item.category ?? 'Uncategorized'}</Copy>
          <Copy muted>
            Folder: {folderPath(item.folderId, data.folders) || 'Unfiled'}
          </Copy>
          {item.description && <Copy>{item.description}</Copy>}
          {item.aliases.filter(Boolean).length > 0 && (
            <Copy muted>
              Other names: {item.aliases.filter(Boolean).join(', ')}
            </Copy>
          )}
          {item.tags.filter(Boolean).length > 0 && (
            <Copy muted>
              {item.tags
                .filter(Boolean)
                .map((tag) => `#${tag.trim()}`)
                .join('  ')}
            </Copy>
          )}
          {item.folderId && (
            <Button
              secondary
              title="Open containing folder"
              icon="folder-outline"
              onPress={() =>
                router.push({
                  pathname: '/folders/[id]',
                  params: { id: item.folderId },
                })
              }
            />
          )}
        </Panel>
      )}
      <Section title="Location history" />
      {data.history
        .filter((h) => h.itemId === id)
        .map((entry) => (
          <View
            key={entry.id}
            style={[
              s.row,
              { alignItems: 'flex-start', justifyContent: 'flex-start' },
            ]}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.primary,
                marginTop: 7,
              }}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Copy style={{ fontWeight: '600' }}>
                {placePath(entry.newPlaceId, data.places) || 'Recorded spot'}
              </Copy>
              {entry.newSpot && <Copy muted>{entry.newSpot}</Copy>}
              <Copy muted style={{ fontSize: 12 }}>
                {new Date(entry.changedAt).toLocaleString()}
              </Copy>
            </View>
          </View>
        ))}
      <ChoiceSheet
        visible={filing}
        title="Organize in a folder"
        searchable
        selected={item.folderId ?? ''}
        options={[
          { value: '', label: 'Unfiled' },
          ...data.folders.map((folder) => ({
            value: folder.id,
            label: folderPath(folder.id, data.folders),
            icon: 'folder-outline' as const,
          })),
        ]}
        onClose={() => setFiling(false)}
        onSelect={(folderId) =>
          run(
            repository
              .saveItem({ ...item, folderId: folderId || undefined }, id)
              .then(() =>
                setNotice('Folder updated. Physical location unchanged.'),
              ),
          )
        }
      />
    </Screen>
  );
}
