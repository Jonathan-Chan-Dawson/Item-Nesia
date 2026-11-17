import { TrashUndo } from '../components/TrashUndo';
import { useRef, useState, type ReactNode, type ComponentRef } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useMemory, useTheme } from '../hooks/useMemory';
import {
  queryInventory,
  groupInventory,
  type GroupBy,
  type InventoryQuery,
} from '../utils/inventory';
import type { Item } from '../types/models';
import { folderPath } from '../utils/folders';
import { placePath } from '../utils/memory';
import {
  ChoiceSheet,
  SearchBox,
  SegmentedChoice,
  type Choice,
} from '../components/controls';
import {
  Button,
  Copy,
  Empty,
  ErrorMessage,
  Icon,
  s,
  confirm,
} from '../components/ui';
import { ItemCard } from '../components/ItemCard';
import { FilterPanel } from '../components/FilterPanel';
import { SurpriseButton } from '../components/SurpriseButton';
import { Reveal } from '../components/Reveal';
type Row =
  | { kind: 'items'; id: string; items: Item[] }
  | { kind: 'group'; id: string; label: string; count: number }
  | { kind: 'leading'; id: string; render(): ReactNode };
const sorts: Choice[] = [
  { value: 'relevance', label: 'Best match' },
  { value: 'recent', label: 'Recently added' },
  { value: 'moved', label: 'Recently moved' },
  { value: 'name', label: 'Alphabetical' },
  { value: 'oldest', label: 'Oldest first' },
];
const groupChoices: Choice[] = [
  { value: 'items', label: 'Items' },
  { value: 'folders', label: 'Folders' },
  { value: 'places', label: 'Places' },
  { value: 'categories', label: 'Categories' },
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
  const { data, repository } = useMemory();
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [query, setQuery] = useState<InventoryQuery>({
    text: initialText,
    view: initialView,
    includeDescendants: !scopeFolderId,
    includeSubplaces: true,
    includeSubfolders: !scopeFolderId,
    sort: initialText ? 'relevance' : 'recent',
    layout: forceList ? 'list' : data.settings.defaultItemsView,
  });
  const [groupBy, setGroupBy] = useState<GroupBy>(
    scopePlaceId || scopeFolderId
      ? 'items'
      : (data.settings.inventoryGroupBy ?? 'items'),
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sortOpen, setSortOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    height: number;
  }>();
  const [trashed, setTrashed] = useState<Item>();
  const [error, setError] = useState<string>();
  const toolbar = useRef<ComponentRef<typeof View>>(null);
  const change = (patch: Partial<InventoryQuery>) =>
    setQuery((previous) => ({ ...previous, ...patch }));
  const effective = {
    ...query,
    placeId: scopePlaceId ?? query.placeId,
    folderId: scopeFolderId ?? query.folderId,
  };
  const items = queryInventory(data, effective);
  const columns =
    query.layout === 'list' || width < 350 || fontScale > 1.3 ? 1 : 2;
  const groups = groupInventory(items, data, groupBy);
  const rows: Row[] = [];
  if (
    groupBy === 'items' &&
    !query.text.trim() &&
    !query.category &&
    !query.placeId &&
    !query.folderId &&
    query.view === 'all'
  )
    rows.push(...leading.map((row) => ({ ...row, kind: 'leading' as const })));
  const addItems = (values: Item[], prefix: string) => {
    for (let index = 0; index < values.length; index += columns)
      rows.push({
        kind: 'items',
        id: `${prefix}:${index}`,
        items: values.slice(index, index + columns),
      });
  };
  if (groupBy === 'items') addItems(items, 'all');
  else
    for (const group of groups) {
      rows.push({
        kind: 'group',
        id: group.id,
        label: group.label,
        count: group.items.length,
      });
      if (!collapsed[`${groupBy}:${group.id}`]) addItems(group.items, group.id);
    }
  const reset = () =>
    change({
      view: initialView === 'trash' ? 'trash' : 'all',
      category: undefined,
      placeId: undefined,
      folderId: undefined,
      includeSubplaces: true,
      includeSubfolders: !scopeFolderId,
    });
  const chips: { label: string; clear(): void }[] = [];
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
    effective.placeId &&
    !(query.includeSubplaces ?? query.includeDescendants)
  )
    chips.push({
      label: 'Direct place only',
      clear: () => change({ includeSubplaces: true }),
    });
  if (
    effective.folderId &&
    effective.folderId !== 'unfiled' &&
    !(query.includeSubfolders ?? query.includeDescendants)
  )
    chips.push({
      label: 'Direct folder only',
      clear: () => change({ includeSubfolders: true }),
    });
  const run = (work: Promise<unknown>) => {
    setError(undefined);
    void work.catch((e) => setError(e.message));
  };
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
      {trashed && (
        <TrashUndo
          key={trashed.id}
          item={trashed}
          onClose={() => setTrashed(undefined)}
        />
      )}
      <FlatList
        data={rows}
        keyExtractor={(row) => `${row.kind}:${row.id}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {header}
            {initialView !== 'trash' && (
              <SegmentedChoice
                value={query.view}
                options={[
                  { value: 'all', label: 'All Active' },
                  {
                    value: 'favorites',
                    label: 'Starred',
                    icon: 'star-outline',
                  },
                  {
                    value: 'archived',
                    label: 'Archived',
                    icon: 'archive-outline',
                  },
                ]}
                onChange={(view) =>
                  change({ view: view as InventoryQuery['view'] })
                }
              />
            )}
            <View
              ref={toolbar}
              collapsable={false}
              style={[s.row, { flexWrap: 'wrap' }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter items"
                accessibilityState={{ expanded: !!anchor }}
                onPress={() => {
                  Keyboard.dismiss();
                  toolbar.current?.measureInWindow((x, y, _width, height) =>
                    setAnchor({ x, y, height }),
                  );
                }}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: colors.soft,
                  justifyContent: 'center',
                }}
              >
                <Copy>Filters{chips.length ? ` · ${chips.length}` : ''}</Copy>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose sort order"
                onPress={() => setSortOpen(true)}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Copy style={{ fontSize: 12 }}>
                  {sorts.find((sort) => sort.value === query.sort)?.label} ▾
                </Copy>
              </Pressable>
            </View>
            <SegmentedChoice
              value={query.layout}
              options={[
                { value: 'grid', label: 'Grid', icon: 'grid-outline' },
                { value: 'list', label: 'List', icon: 'list-outline' },
              ]}
              onChange={(layout) =>
                change({ layout: layout as InventoryQuery['layout'] })
              }
            />
            <Copy muted style={{ fontSize: 12 }}>
              View by
            </Copy>
            <ScrollView
              horizontal
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {groupChoices.map((choice) => (
                <Pressable
                  key={choice.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: groupBy === choice.value }}
                  onPress={() => {
                    setGroupBy(choice.value as GroupBy);
                    setCollapsed({});
                    run(
                      repository.settings({
                        inventoryGroupBy: choice.value as GroupBy,
                      }),
                    );
                  }}
                  style={{
                    minHeight: 44,
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                    backgroundColor:
                      groupBy === choice.value ? colors.soft : colors.surface,
                    borderRadius: 12,
                  }}
                >
                  <Copy>{choice.label}</Copy>
                </Pressable>
              ))}
            </ScrollView>
            {!!chips.length && (
              <ScrollView
                horizontal
                contentContainerStyle={{ gap: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                {chips.map((chip) => (
                  <Pressable
                    key={chip.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${chip.label} filter`}
                    onPress={chip.clear}
                    style={{
                      minHeight: 44,
                      justifyContent: 'center',
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      backgroundColor: colors.soft,
                    }}
                  >
                    <Copy style={{ fontSize: 12 }}>{chip.label} ×</Copy>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={reset}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Copy>Reset</Copy>
                </Pressable>
              </ScrollView>
            )}
            <Copy muted style={{ fontSize: 12 }}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
              {effective.placeId
                ? ` · In ${placePath(effective.placeId, data.places)}${query.includeSubplaces ? ' including subplaces' : ' directly here'}`
                : ''}
              {effective.folderId
                ? ` · ${effective.folderId === 'unfiled' ? 'Unfiled' : folderPath(effective.folderId, data.folders)}${effective.folderId !== 'unfiled' ? (query.includeSubfolders ? ' including subfolders' : ' directly here') : ''}`
                : ''}
            </Copy>
            {(scopePlaceId || scopeFolderId) && (
              <Button
                secondary
                title="Search everywhere"
                onPress={() =>
                  router.push({
                    pathname: '/items',
                    params: { query: query.text },
                  })
                }
              />
            )}
            {groupBy !== 'items' && !!groups.length && (
              <View style={s.row}>
                {['Expand all', 'Collapse all'].map((title, index) => (
                  <Pressable
                    key={title}
                    accessibilityRole="button"
                    onPress={() =>
                      setCollapsed(
                        Object.fromEntries(
                          groups.map((group) => [
                            `${groupBy}:${group.id}`,
                            index === 1,
                          ]),
                        ),
                      )
                    }
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Copy style={{ fontSize: 12 }}>{title}</Copy>
                  </Pressable>
                ))}
              </View>
            )}
            {initialView === 'trash' && !!items.length && (
              <Button
                danger
                title="Empty Trash"
                onPress={() => {
                  void confirm(
                    'Empty Trash?',
                    'Permanently delete every trashed item, its history, and photos no longer used elsewhere? This cannot be undone.',
                  ).then((yes) => {
                    if (yes) run(repository.emptyTrash());
                  });
                }}
              />
            )}
            <ErrorMessage message={error} />
          </View>
        }
        renderItem={({ item: row }) =>
          row.kind === 'leading' ? (
            row.render()
          ) : row.kind === 'group' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                expanded: !collapsed[`${groupBy}:${row.id}`],
              }}
              onPress={() =>
                setCollapsed((previous) => ({
                  ...previous,
                  [`${groupBy}:${row.id}`]: !previous[`${groupBy}:${row.id}`],
                }))
              }
              style={[
                s.row,
                {
                  minHeight: 52,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: colors.soft,
                },
              ]}
            >
              <Copy style={{ flex: 1, fontWeight: '700' }}>
                {row.label} · {row.count}
              </Copy>
              <Icon
                name={
                  collapsed[`${groupBy}:${row.id}`]
                    ? 'chevron-down'
                    : 'chevron-up'
                }
                size={16}
              />
            </Pressable>
          ) : (
            <Reveal>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {row.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onTrash={setTrashed}
                    list={query.layout === 'list'}
                  />
                ))}
                {columns === 2 && row.items.length === 1 && (
                  <View style={{ flex: 1 }} />
                )}
              </View>
            </Reveal>
          )
        }
        ListEmptyComponent={
          <View style={{ gap: 12 }}>
            <Empty
              title={
                initialView === 'trash'
                  ? 'Trash is empty.'
                  : 'No matching items here.'
              }
              message={
                initialView === 'trash'
                  ? 'Deleted items stay here until you restore or permanently remove them.'
                  : (emptyMessage ??
                    'Try resetting filters, or remember a new item. Organization is optional.')
              }
            />
            {!!chips.length && (
              <Button secondary title="Reset filters" onPress={reset} />
            )}
            {initialView !== 'trash' && (
              <Button
                title="Remember an item"
                onPress={onAdd ?? (() => router.push('/capture'))}
              />
            )}
          </View>
        }
        ListFooterComponent={
          query.view !== 'archived' && query.view !== 'trash' ? (
            <View style={{ marginTop: 20 }}>
              <SurpriseButton items={items} />
            </View>
          ) : undefined
        }
      />
      {anchor && (
        <FilterPanel
          anchor={anchor}
          query={query}
          scopePlaceId={scopePlaceId}
          scopeFolderId={scopeFolderId}
          change={change}
          reset={reset}
          onClose={() => setAnchor(undefined)}
        />
      )}
      <ChoiceSheet
        visible={sortOpen}
        title="Sort items"
        options={sorts}
        selected={query.sort}
        onSelect={(sort) => change({ sort: sort as InventoryQuery['sort'] })}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}
