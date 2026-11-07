import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useMemory } from '../hooks/useMemory';
import { ItemCard } from '../components/ItemCard';
import {
  Button,
  Copy,
  Empty,
  Header,
  IconButton,
  Screen,
} from '../components/ui';
import { router } from 'expo-router';

export function ItemGallery({
  filter = 'all',
  placeId,
}: {
  filter?: 'all' | 'favorites' | 'archived';
  placeId?: string;
}) {
  const { data } = useMemory();
  const [list, setList] = useState(data.settings.defaultItemsView === 'list');
  const [sort, setSort] = useState<'recent' | 'name' | 'moved' | 'oldest'>(
    'recent',
  );
  const items = data.items
    .filter(
      (i) =>
        (filter === 'archived' ? i.isArchived : !i.isArchived) &&
        (filter !== 'favorites' || i.isFavorite) &&
        (!placeId || i.placeId === placeId),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'moved'
          ? b.locationUpdatedAt.localeCompare(a.locationUpdatedAt)
          : sort === 'oldest'
            ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <Screen scroll={false}>
      <Header
        title={
          filter === 'favorites'
            ? 'Favorites'
            : filter === 'archived'
              ? 'Archived Items'
              : 'All Items'
        }
        right={
          <IconButton
            icon={list ? 'grid-outline' : 'list-outline'}
            label={list ? 'Show grid' : 'Show list'}
            onPress={() => setList(!list)}
          />
        }
      />
      <Copy muted>
        {items.length} {items.length === 1 ? 'memory' : 'memories'}
      </Copy>
      <Button
        secondary
        title={`Sort: ${sort === 'recent' ? 'Recently added' : sort === 'name' ? 'Alphabetical' : sort === 'moved' ? 'Recently moved' : 'Oldest'} · change`}
        onPress={() =>
          setSort(
            sort === 'recent'
              ? 'name'
              : sort === 'name'
                ? 'moved'
                : sort === 'moved'
                  ? 'oldest'
                  : 'recent',
          )
        }
      />
      <FlatList
        key={list ? 'list' : 'grid'}
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={list ? 1 : 2}
        columnWrapperStyle={list ? undefined : { gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={{ width: list ? '100%' : '48%' }}>
            <ItemCard item={item} list={list} />
          </View>
        )}
        ListEmptyComponent={
          <Empty
            title="A little room for memories."
            message="Items saved to this collection will appear here."
            action="Remember an Item"
            onPress={() => router.push('/capture')}
          />
        }
      />
    </Screen>
  );
}
