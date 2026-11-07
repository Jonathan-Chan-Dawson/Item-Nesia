import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  Button,
  confirm,
  Copy,
  Empty,
  ErrorMessage,
  Header,
  IconButton,
  Panel,
  Screen,
  Section,
} from '../../components/ui';
import { ItemPhoto } from '../../components/ItemCard';
import { useMemory } from '../../hooks/useMemory';
import { placePath } from '../../utils/memory';

export default function ItemDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, repository } = useMemory();
  const [error, setError] = useState<string>();
  const [found, setFound] = useState(false);
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
          title="This memory isn’t here."
          message="It may have been deleted."
        />
      </Screen>
    );
  return (
    <Screen>
      <Header
        title={item.name}
        right={
          <IconButton
            icon={item.isFavorite ? 'heart' : 'heart-outline'}
            label={item.isFavorite ? 'Remove favorite' : 'Favorite item'}
            onPress={() =>
              run(repository.updateItem(id, { isFavorite: !item.isFavorite }))
            }
          />
        }
      />
      <ItemPhoto item={item} height={280} />
      <Copy title style={{ fontSize: 29 }}>
        {item.name}
      </Copy>
      <Copy muted>
        {[
          item.category,
          item.isDemo ? 'Demo item' : undefined,
          item.isArchived ? 'Archived' : undefined,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Copy>
      {item.description && <Copy>{item.description}</Copy>}
      {item.tags.filter(Boolean).length > 0 && (
        <Copy muted>
          {item.tags
            .filter(Boolean)
            .map((tag) => `#${tag.trim()}`)
            .join('  ')}
        </Copy>
      )}
      <Panel>
        <Copy
          muted
          style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: '700' }}
        >
          LAST SAVED LOCATION
        </Copy>
        <Copy title>
          {placePath(item.placeId, data.places) || 'Exact spot'}
        </Copy>
        {item.exactSpot && <Copy>{item.exactSpot}</Copy>}
        <Copy muted style={{ fontSize: 12 }}>
          Last recorded: {new Date(item.locationUpdatedAt).toLocaleDateString()}{' '}
          · Recorded by you, not live tracking.
        </Copy>
      </Panel>
      {item.locationPhotoUri && (
        <>
          <Section title="Here’s where you left it." />
          <Image
            source={{ uri: item.locationPhotoUri }}
            style={{ height: 260, borderRadius: 22 }}
            contentFit="contain"
            onError={() =>
              setError(
                'The location photo could not be opened. You can replace it by editing the item.',
              )
            }
          />
        </>
      )}
      <ErrorMessage message={error} />
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
        icon="file-tray-outline"
        onPress={() =>
          router.push({ pathname: '/items/move/[id]', params: { id } })
        }
      />
      <Button
        title="Edit"
        secondary
        icon="create-outline"
        onPress={() =>
          router.push({ pathname: '/items/edit/[id]', params: { id } })
        }
      />
      <Section title="Location history" />
      {data.history
        .filter((h) => h.itemId === id)
        .map((entry) => (
          <Panel key={entry.id}>
            <Copy style={{ fontWeight: '600' }}>
              {placePath(entry.newPlaceId, data.places) || 'Recorded spot'}
            </Copy>
            <Copy muted>{entry.newSpot}</Copy>
            <Copy muted style={{ fontSize: 12 }}>
              {new Date(entry.changedAt).toLocaleString()}
            </Copy>
          </Panel>
        ))}
      <Button
        title={item.isArchived ? 'Restore item' : 'Archive item'}
        secondary
        icon="archive-outline"
        onPress={() =>
          run(repository.updateItem(id, { isArchived: !item.isArchived }))
        }
      />
      <Button
        title="Delete item"
        danger
        onPress={() => {
          void confirm(
            'Delete this item?',
            'This removes the item and its location history.',
          ).then((yes) => {
            if (yes)
              run(repository.deleteItem(id).then(() => router.replace('/')));
          });
        }}
      />
    </Screen>
  );
}
