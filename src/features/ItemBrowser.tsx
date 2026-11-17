import { useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useMemory, useTheme } from '../hooks/useMemory';
import { categories, type Category, type Item } from '../types/models';
import { queryInventory, type InventoryQuery } from '../utils/inventory';
import { folderPath } from '../utils/folders';
import { placePath } from '../utils/memory';
import { ChoiceSheet, SearchBox, type Choice } from '../components/controls';
import { Button, Copy, Empty, Icon, IconButton, s } from '../components/ui';
import { ItemCard } from '../components/ItemCard';
type Sheet = 'filters' | 'view' | 'category' | 'place' | 'folder' | 'sort';
type BrowserRow =
  | { kind: 'item'; item: Item }
  | { kind: 'leading'; id: string; render(): ReactNode };
const sorts: Choice[] = [
  { value: 'relevance', label: 'Best match', icon: 'search-outline' },
  { value: 'recent', label: 'Recently added', icon: 'add-circle-outline' },
  { value: 'moved', label: 'Recently moved', icon: 'swap-horizontal-outline' },
  { value: 'name', label: 'Alphabetical', icon: 'text-outline' },
  { value: 'oldest', label: 'Oldest first', icon: 'time-outline' },
];
const views: Choice[] = [
  { value: 'all', label: 'All Active' },
  { value: 'favorites', label: 'Favorites', icon: 'heart-outline' },
  { value: 'archived', label: 'Archived', icon: 'archive-outline' },
];
export function ItemBrowser({
  initialView = 'all',
  initialText = '',
  scopePlaceId,
  scopeFolderId,
  autoFocus,
  forceList,
  header,
  leading = [],
  emptyMessage,
  onAdd,
}: {
  initialView?: InventoryQuery['view'];
  initialText?: string;
  scopePlaceId?: string;
  scopeFolderId?: string;
  autoFocus?: boolean;
  forceList?: boolean;
  header?: ReactNode;
  leading?: { id: string; render(): ReactNode }[];
  emptyMessage?: string;
  onAdd?(): void;
}) {
  const { data } = useMemory();
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [query, setQuery] = useState<InventoryQuery>({
    text: initialText,
    view: initialView,
    includeDescendants: !scopeFolderId,
    sort: initialText ? 'relevance' : 'recent',
    layout: forceList ? 'list' : data.settings.defaultItemsView,
  });
  const [sheet, setSheet] = useState<Sheet>();
  const change = (patch: Partial<InventoryQuery>) =>
    setQuery((previous) => ({ ...previous, ...patch }));
  const effective = {
    ...query,
    placeId: scopePlaceId ?? query.placeId,
    folderId: scopeFolderId ?? query.folderId,
  };
  const items = queryInventory(data, effective);
  const rows: BrowserRow[] = [
    ...(query.text.trim() ||
    query.category ||
    query.placeId ||
    query.folderId ||
    query.view !== 'all'
      ? []
      : leading
    ).map((row) => ({ ...row, kind: 'leading' as const })),
    ...items.map((item) => ({ kind: 'item' as const, item })),
  ];
  const columns =
    query.layout === 'list' || width < 350 || fontScale > 1.3 ? 1 : 2;
  const reset = () =>
    change({
      view: 'all',
      category: undefined,
      placeId: undefined,
      folderId: undefined,
      includeDescendants: !scopeFolderId,
    });
  const chips: { label: string; clear(): void }[] = [];
  if (query.view !== 'all')
    chips.push({
      label: query.view === 'favorites' ? 'Favorites' : 'Archived',
      clear: () => change({ view: 'all' }),
    });
  if (query.category)
    chips.push({
      label:
        query.category === 'uncategorized' ? 'Uncategorized' : query.category,
      clear: () => change({ category: undefined }),
    });
  if (query.placeId && !scopePlaceId)
    chips.push({
      label: `Place: ${placePath(query.placeId, data.places)}`,
      clear: () => change({ placeId: undefined }),
    });
  if (query.folderId && !scopeFolderId)
    chips.push({
      label:
        query.folderId === 'unfiled'
          ? 'Unfiled'
          : `Folder: ${folderPath(query.folderId, data.folders)}`,
      clear: () => change({ folderId: undefined }),
    });
  if (
    !query.includeDescendants &&
    (effective.placeId ||
      (effective.folderId && effective.folderId !== 'unfiled'))
  )
    chips.push({
      label: 'Direct items only',
      clear: () => change({ includeDescendants: true }),
    });
  const options: Choice[] =
    sheet === 'view'
      ? views
      : sheet === 'sort'
        ? sorts
        : sheet === 'category'
          ? [
              { value: '', label: 'All categories' },
              { value: 'uncategorized', label: 'Uncategorized' },
              ...categories.map((category) => ({
                value: category,
                label: category,
              })),
            ]
          : sheet === 'place'
            ? [
                { value: '', label: 'All places' },
                ...data.places.map((place) => ({
                  value: place.id,
                  label: placePath(place.id, data.places),
                  icon: 'location-outline' as const,
                })),
              ]
            : sheet === 'folder'
              ? [
                  { value: '', label: 'All folders' },
                  { value: 'unfiled', label: 'Unfiled' },
                  ...data.folders.map((folder) => ({
                    value: folder.id,
                    label: folderPath(folder.id, data.folders),
                    icon: 'folder-outline' as const,
                  })),
                ]
              : [
                  {
                    value: 'view',
                    label: `View: ${views.find((view) => view.value === query.view)?.label}`,
                  },
                  {
                    value: 'category',
                    label: `Category: ${query.category ?? 'All'}`,
                  },
                  ...(!scopePlaceId
                    ? [
                        {
                          value: 'place',
                          label: `Place: ${placePath(query.placeId, data.places) || 'All'}`,
                        },
                      ]
                    : []),
                  ...(!scopeFolderId
                    ? [
                        {
                          value: 'folder',
                          label: `Folder: ${query.folderId === 'unfiled' ? 'Unfiled' : folderPath(query.folderId, data.folders) || 'All'}`,
                        },
                      ]
                    : []),
                  ...(effective.placeId ||
                  (effective.folderId && effective.folderId !== 'unfiled')
                    ? [
                        {
                          value: 'descendants',
                          label: query.includeDescendants
                            ? 'Show only items directly here'
                            : 'Include subplaces / subfolders',
                        },
                      ]
                    : []),
                  {
                    value: 'reset',
                    label: 'Reset filters',
                    icon: 'refresh-outline',
                  },
                ];
  const selected =
    sheet === 'view'
      ? query.view
      : sheet === 'sort'
        ? query.sort
        : sheet === 'category'
          ? (query.category ?? '')
          : sheet === 'place'
            ? (query.placeId ?? '')
            : sheet === 'folder'
              ? (query.folderId ?? '')
              : undefined;
  const activeScope = scopePlaceId
    ? `In ${placePath(scopePlaceId, data.places)}`
    : scopeFolderId === 'unfiled'
      ? 'Unfiled items'
      : scopeFolderId
        ? `In ${folderPath(scopeFolderId, data.folders)}`
        : 'All items';
  return (
    <View style={{ flex: 1, gap: 12 }}>
      <SearchBox
        value={query.text}
        onChangeText={(text) =>
          change({ text, sort: text.trim() ? 'relevance' : query.sort })
        }
        placeholder={
          scopePlaceId || scopeFolderId ? 'Search here…' : 'Find an item…'
        }
        autoFocus={autoFocus}
      />
      <View style={[s.row, { gap: 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter items"
          onPress={() => setSheet('filters')}
          style={[
            s.row,
            {
              minHeight: 44,
              gap: 6,
              paddingHorizontal: 12,
              backgroundColor: colors.soft,
              borderRadius: 12,
            },
          ]}
        >
          <Icon name="options-outline" size={17} />
          <Copy style={{ fontSize: 12, fontWeight: '600' }}>
            Filters{chips.length ? ` · ${chips.length}` : ''}
          </Copy>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose sort order"
          onPress={() => setSheet('sort')}
          style={[
            s.row,
            { flex: 1, minHeight: 44, gap: 5, justifyContent: 'center' },
          ]}
        >
          <Copy numberOfLines={1} style={{ fontSize: 12 }}>
            {sorts.find((sort) => sort.value === query.sort)?.label}
          </Copy>
          <Icon name="chevron-down" size={12} />
        </Pressable>
        <IconButton
          icon={query.layout === 'list' ? 'grid-outline' : 'list-outline'}
          label={query.layout === 'list' ? 'Show grid' : 'Show list'}
          onPress={() =>
            change({ layout: query.layout === 'list' ? 'grid' : 'list' })
          }
        />
      </View>
      {!!chips.length && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {chips.map((chip) => (
            <Pressable
              key={chip.label}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${chip.label} filter`}
              onPress={chip.clear}
              style={[
                s.row,
                {
                  backgroundColor: colors.soft,
                  paddingHorizontal: 10,
                  minHeight: 44,
                  borderRadius: 12,
                  gap: 6,
                },
              ]}
            >
              <Copy style={{ fontSize: 12 }}>{chip.label}</Copy>
              <Icon name="close" size={13} />
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={reset}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Copy style={{ fontSize: 12 }}>Reset</Copy>
          </Pressable>
        </ScrollView>
      )}
      <Copy muted style={{ fontSize: 12 }}>
        {items.length} {items.length === 1 ? 'item' : 'items'} · {activeScope}
        {effective.placeId ||
        (effective.folderId && effective.folderId !== 'unfiled')
          ? query.includeDescendants
            ? ' · including children'
            : ' · directly here'
          : ''}
      </Copy>
      {(scopePlaceId || scopeFolderId) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search everywhere"
          onPress={() =>
            router.push({ pathname: '/items', params: { query: query.text } })
          }
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Copy style={{ fontSize: 13, color: colors.primary }}>
            Search everywhere →
          </Copy>
        </Pressable>
      )}
      <FlatList
        key={`${query.layout}:${columns}`}
        style={{ flex: 1 }}
        data={rows}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(row) =>
          row.kind === 'item' ? `item:${row.item.id}` : `leading:${row.id}`
        }
        numColumns={columns}
        columnWrapperStyle={columns === 1 ? undefined : { gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListHeaderComponent={
          header ? (
            <View style={{ gap: 12, marginBottom: 4 }}>{header}</View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={{ width: columns === 1 ? '100%' : '48%' }}>
            {item.kind === 'leading' ? (
              item.render()
            ) : (
              <ItemCard item={item.item} list={query.layout === 'list'} />
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ gap: 12 }}>
            <Empty
              title={
                query.text.trim() || chips.length
                  ? 'No matching items here.'
                  : 'Room for your belongings.'
              }
              message={
                chips.length
                  ? 'A filter may be hiding what you need. Try resetting filters or searching everywhere.'
                  : (emptyMessage ??
                    'Save an item with a name and a place. Organization is optional.')
              }
              action="Remember an item"
              onPress={onAdd ?? (() => router.push('/capture'))}
            />
            {!!chips.length && (
              <Button secondary title="Reset filters" onPress={reset} />
            )}
          </View>
        }
      />
      <ChoiceSheet
        visible={!!sheet}
        title={
          sheet === 'filters'
            ? 'Filter items'
            : sheet === 'sort'
              ? 'Sort items'
              : `Choose ${sheet ?? 'filter'}`
        }
        options={options}
        selected={selected}
        searchable={sheet === 'place' || sheet === 'folder'}
        closeOnSelect={sheet !== 'filters'}
        onClose={() => setSheet(undefined)}
        onSelect={(value) => {
          if (sheet === 'filters') {
            if (value === 'reset') {
              reset();
              setSheet(undefined);
            } else if (value === 'descendants') {
              change({ includeDescendants: !query.includeDescendants });
              setSheet(undefined);
            } else setSheet(value as Sheet);
          } else if (sheet === 'view')
            change({ view: value as InventoryQuery['view'] });
          else if (sheet === 'sort')
            change({ sort: value as InventoryQuery['sort'] });
          else if (sheet === 'category')
            change({
              category: (value || undefined) as
                Category | 'uncategorized' | undefined,
            });
          else if (sheet === 'place') change({ placeId: value || undefined });
          else if (sheet === 'folder') change({ folderId: value || undefined });
        }}
      />
    </View>
  );
}
