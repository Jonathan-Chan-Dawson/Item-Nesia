import { LocationHistoryTimeline } from '../../components/LocationHistoryTimeline';
import { LocationSummary } from '../../components/LocationSummary';
import { locationSnapshot } from '../../utils/locations';
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
  s,
} from '../../components/ui';
import { StarButton } from '../../components/StarButton';
import { ItemPhoto } from '../../components/ItemCard';
import { useMemory } from '../../hooks/useMemory';
import { ChoiceSheet } from '../../components/controls';
import { OverflowMenu } from '../../components/OverflowMenu';
import { folderPath } from '../../utils/folders';
export default function ItemDetails() {
  const { id, moveId, moved } = useLocalSearchParams<{
    id: string;
    moveId?: string;
    moved?: string;
  }>();
  const { data, repository } = useMemory();
  const [error, setError] = useState<string>();
  const [found, setFound] = useState(false);
  const [details, setDetails] = useState(false);
  const [filing, setFiling] = useState(false);
  const [moveDismissed, setMoveDismissed] = useState(false);
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
  if (item.deletedAt)
    return (
      <Screen>
        <Header title={item.name} />
        <ItemPhoto item={item} height={220} />
        <Copy title>In Trash</Copy>
        <Copy muted>
          {item.name} is kept with its photos and location history. It stays
          here until you restore or permanently delete it.
        </Copy>
        <Copy muted>
          Deleted {new Date(item.deletedAt).toLocaleDateString()}. Restore
          returns it to {item.isArchived ? 'Archive' : 'your active items'}.
        </Copy>
        <Button
          title="Undo · restore item"
          icon="arrow-undo-outline"
          onPress={() =>
            run(
              repository
                .restoreItem(id)
                .then(() =>
                  setNotice(
                    item.isArchived ? 'Restored to Archive.' : 'Item restored.',
                  ),
                ),
            )
          }
        />
        <Button
          danger
          title="Delete permanently"
          icon="trash-outline"
          onPress={() => {
            void confirm(
              `Permanently delete ${item.name}?`,
              'Its history and photos no longer used elsewhere will be removed. This cannot be undone.',
            ).then((yes) => {
              if (yes)
                run(
                  repository
                    .deleteItem(id)
                    .then(() => router.replace('/trash')),
                );
            });
          }}
        />
        <ErrorMessage message={error} />
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
                label: item.isFavorite ? 'Unstar item' : 'Star item',
                icon: 'star-outline',
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
              {
                value: 'delete',
                label: 'Move to Trash',
                icon: 'trash-outline',
              },
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
                run(
                  repository
                    .trashItem(id)
                    .then(() => setNotice('Moved to Trash.')),
                );
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
          <StarButton item={item} />
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
      <Panel>
        <LocationSummary
          snapshot={locationSnapshot(item, data.places)}
          label="Saved location"
        />
        <Copy muted style={{ fontSize: 11 }}>
          Saved {new Date(item.locationUpdatedAt).toLocaleDateString()}
        </Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            secondary
            title="Move item"
            icon="swap-horizontal-outline"
            onPress={() =>
              router.push({ pathname: '/items/move/[id]', params: { id } })
            }
          />
          {item.placeId && (
            <Button
              secondary
              title="Open place"
              icon="location-outline"
              onPress={() =>
                router.push({
                  pathname: '/places/[id]',
                  params: { id: item.placeId },
                })
              }
            />
          )}
        </View>
      </Panel>
      {moved !== undefined && !moveDismissed && (
        <Panel>
          <Copy>
            {moved === '1' ? 'Location saved.' : 'Location unchanged.'}
          </Copy>
          {moveId && (
            <Button
              secondary
              title="Undo move"
              icon="arrow-undo-outline"
              onPress={() =>
                run(
                  repository.undoMove(id, moveId).then(() => {
                    setMoveDismissed(true);
                    setNotice('Previous location restored.');
                  }),
                )
              }
            />
          )}
          <Button
            secondary
            title="Dismiss"
            onPress={() => setMoveDismissed(true)}
          />
        </Panel>
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
      <LocationHistoryTimeline itemId={id} />
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
