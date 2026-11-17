import { TrashUndo } from '../components/TrashUndo';
import type { Item } from '../types/models';
import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Copy,
  Empty,
  ErrorMessage,
  Header,
  Icon,
  Screen,
  Section,
  s,
} from '../components/ui';
import { SurpriseButton } from '../components/SurpriseButton';
import { OrganizeSamples } from '../components/OrganizeSamples';
import { validIcon } from '../utils/icons';
import type { IconName } from '../components/ui';
import { ItemCard } from '../components/ItemCard';
import { useMemory, useTheme } from '../hooks/useMemory';
import { StarredCard } from '../components/StarredCard';
import { homeSections } from '../utils/inventory';
import { placePath } from '../utils/memory';
import { folderPath } from '../utils/folders';
import { SegmentedChoice } from '../components/controls';
import { DEMO_ITEM_COUNT } from '../database/demo';
import { Welcome } from '../features/Welcome';
export default function Home() {
  const { data, repository, isDemo, startDemo } = useMemory();
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 350 || fontScale > 1.3 ? 1 : 2;
  const [trashed, setTrashed] = useState<Item>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const list = data.settings.homeItemsView === 'list';
  const itemColumns = list ? 1 : columns;
  function addSamples() {
    setBusy(true);
    setError(undefined);
    void startDemo()
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }
  const {
    starred,
    recent: items,
    activeCount,
  } = homeSections(data.items, columns);
  if (
    !isDemo &&
    !data.settings.onboardingCompleted &&
    !data.items.length &&
    !data.places.length &&
    !data.folders.length
  )
    return <Welcome />;
  return (
    <Screen
      overlay={
        trashed ? (
          <TrashUndo
            key={trashed.id}
            item={trashed}
            onClose={() => setTrashed(undefined)}
          />
        ) : undefined
      }
    >
      <Header title="Item-Nesia" home />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search your items"
        onPress={() => router.push('/search')}
        style={({ pressed }) => [
          s.row,
          {
            minHeight: 58,
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            borderRadius: 17,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.6 : 1,
          },
        ]}
      >
        <Icon name="search-outline" />
        <Copy muted style={{ flex: 1 }}>
          Where did I put my…?
        </Copy>
        <Icon name="arrow-forward" size={17} />
      </Pressable>
      <Button
        title="Remember an item"
        icon="camera-outline"
        onPress={() => router.push('/capture')}
      />
      <View style={{ gap: 8 }}>
        <Copy muted style={{ fontSize: 12, fontWeight: '600' }}>
          Browse
        </Copy>
        <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
          {(
            [
              { title: 'All Items', href: '/items', icon: 'grid-outline' },
              { title: 'Folders', href: '/folders', icon: 'folder-outline' },
              { title: 'Places', href: '/places', icon: 'location-outline' },
            ] as const
          ).map((link) => (
            <Pressable
              key={link.href}
              accessibilityRole="button"
              accessibilityLabel={link.title}
              onPress={() => router.push(link.href)}
              style={[
                s.row,
                {
                  minHeight: 48,
                  paddingHorizontal: 13,
                  borderRadius: 13,
                  backgroundColor: colors.soft,
                  gap: 7,
                },
              ]}
            >
              <Icon name={link.icon} size={17} />
              <Copy style={{ fontSize: 13, fontWeight: '600' }}>
                {link.title}
              </Copy>
            </Pressable>
          ))}
        </View>
      </View>
      {!!data.settings.quickAccess.length && (
        <View style={{ gap: 10 }}>
          <Section
            title="Quick Access"
            action="Edit"
            onPress={() => router.push('/quick-access')}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {data.settings.quickAccess.map((ref) => {
              const target = (
                ref.kind === 'place' ? data.places : data.folders
              ).find((entity) => entity.id === ref.id);
              if (!target) return null;
              return (
                <Pressable
                  key={`${ref.kind}:${ref.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${ref.kind === 'place' ? placePath(ref.id, data.places) : folderPath(ref.id, data.folders)}, ${ref.kind}`}
                  onPress={() =>
                    router.push({
                      pathname:
                        ref.kind === 'place' ? '/places/[id]' : '/folders/[id]',
                      params: { id: ref.id },
                    })
                  }
                  style={({ pressed }) => ({
                    width: columns === 1 ? '100%' : '48%',
                    padding: 14,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    gap: 7,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Icon
                    name={
                      validIcon(
                        target.icon,
                        ref.kind === 'place'
                          ? 'location-outline'
                          : 'folder-outline',
                      ) as IconName
                    }
                    size={20}
                  />
                  <Copy
                    numberOfLines={2}
                    style={{ fontWeight: '700', fontSize: 14 }}
                  >
                    {target.name}
                  </Copy>
                  <Copy muted style={{ fontSize: 11, lineHeight: 16 }}>
                    {ref.kind === 'place' ? 'Place' : 'Folder'}
                    {target.parentId
                      ? ` · ${ref.kind === 'place' ? placePath(target.parentId, data.places) : folderPath(target.parentId, data.folders)}`
                      : ''}
                  </Copy>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      <ErrorMessage message={error} />
      {!!starred.length && (
        <View style={{ gap: 8 }}>
          <Section
            title="Starred"
            action="View all"
            onPress={() => router.push('/favorites')}
          />
          <View style={{ gap: 8 }}>
            {Array.from(
              { length: Math.ceil(starred.length / columns) },
              (_, row) => (
                <View key={row} style={{ flexDirection: 'row', gap: 8 }}>
                  {starred
                    .slice(row * columns, (row + 1) * columns)
                    .map((item) => (
                      <StarredCard key={item.id} item={item} />
                    ))}
                  {columns === 2 && row * columns + 1 >= starred.length && (
                    <View style={{ flex: 1 }} />
                  )}
                </View>
              ),
            )}
          </View>
        </View>
      )}
      {(!activeCount || !!items.length) && (
        <View style={{ gap: 10 }}>
          <Section
            title="Recently saved"
            action={items.length ? 'View all' : undefined}
            onPress={() => router.push('/items')}
          />
          {items.length ? (
            <>
              <Copy muted style={{ fontSize: 12 }}>
                Recently added or given a new saved location.
              </Copy>
              <SegmentedChoice
                value={list ? 'list' : 'grid'}
                options={[
                  { value: 'grid', label: 'Grid', icon: 'grid-outline' },
                  { value: 'list', label: 'List', icon: 'list-outline' },
                ]}
                onChange={(value) => {
                  setError(undefined);
                  void repository
                    .settings({ homeItemsView: value as 'grid' | 'list' })
                    .catch((e) => setError(e.message));
                }}
              />
              <View style={{ gap: 12 }}>
                {Array.from(
                  { length: Math.ceil(items.length / itemColumns) },
                  (_, row) => (
                    <View key={row} style={{ flexDirection: 'row', gap: 12 }}>
                      {items
                        .slice(row * itemColumns, (row + 1) * itemColumns)
                        .map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            list={list}
                            onTrash={setTrashed}
                          />
                        ))}
                      {itemColumns === 2 &&
                        row * itemColumns + 1 >= items.length && (
                          <View style={{ flex: 1 }} />
                        )}
                    </View>
                  ),
                )}
              </View>
            </>
          ) : (
            <>
              <Empty
                title="Let’s remember your first thing."
                message="Save a name and a place. Photos and organization can come later."
              />
              <Button
                secondary
                title={`Try the demo · ${DEMO_ITEM_COUNT} sample items`}
                busy={busy}
                disabled={isDemo}
                onPress={addSamples}
              />
            </>
          )}
        </View>
      )}
      <OrganizeSamples />
      <SurpriseButton items={data.items} />
      <View style={[s.row, { justifyContent: 'center', gap: 6 }]}>
        <Icon name="lock-closed-outline" size={12} color={colors.secondary} />
        <Copy muted style={{ fontSize: 11 }}>
          Your belongings. Saved on this device.
        </Copy>
      </View>
    </Screen>
  );
}
