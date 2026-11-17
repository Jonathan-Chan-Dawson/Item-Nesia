import { useMotion } from '../hooks/useMotion';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Switch,
  View,
  useWindowDimensions,
} from 'react-native';
import { useMemory, useTheme } from '../hooks/useMemory';
import { categories, type Category } from '../types/models';
import type { InventoryQuery } from '../utils/inventory';
import { placePath } from '../utils/memory';
import { folderPath } from '../utils/folders';
import { validIcon } from '../utils/icons';
import { Copy, IconButton, s, type IconName } from './ui';
import { SearchBox, SelectionRow, type Choice } from './controls';
export function FilterPanel({
  anchor,
  query,
  change,
  onClose,
  reset,
  scopePlaceId,
  scopeFolderId,
}: {
  anchor: { x: number; y: number; height: number };
  query: InventoryQuery;
  change(patch: Partial<InventoryQuery>): void;
  onClose(): void;
  reset(): void;
  scopePlaceId?: string;
  scopeFolderId?: string;
}) {
  const motion = useMotion();
  const { data } = useMemory();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [facet, setFacet] = useState<'category' | 'place' | 'folder'>();
  const [text, setText] = useState('');
  const panelWidth = Math.min(420, width - 24);
  const availableBelow = height - anchor.y - anchor.height - 20;
  const top = availableBelow >= 280 ? anchor.y + anchor.height + 6 : 24;
  const options: Choice[] =
    facet === 'category'
      ? [
          { value: '', label: 'All categories' },
          { value: 'uncategorized', label: 'Uncategorized' },
          ...categories.map((category) => ({
            value: category,
            label: category,
          })),
        ]
      : facet === 'place'
        ? [
            { value: '', label: 'All places' },
            ...data.places.map((place) => ({
              value: place.id,
              label: placePath(place.id, data.places),
              icon: validIcon(place.icon, 'location-outline') as IconName,
            })),
          ]
        : facet === 'folder'
          ? [
              { value: '', label: 'All folders' },
              { value: 'unfiled', label: 'Unfiled' },
              ...data.folders.map((folder) => ({
                value: folder.id,
                label: folderPath(folder.id, data.folders),
                icon: validIcon(folder.icon, 'folder-outline') as IconName,
              })),
            ]
          : [];
  const selectFacet = (value: typeof facet) => {
    setFacet(value === facet ? undefined : value);
    setText('');
  };
  return (
    <Modal
      transparent
      visible
      animationType={motion ? 'fade' : 'none'}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss filters"
        onPress={onClose}
        style={{ position: 'absolute', inset: 0, backgroundColor: '#00000033' }}
      />
      <View
        accessibilityViewIsModal
        style={{
          position: 'absolute',
          top,
          left: Math.max(12, Math.min(anchor.x, width - panelWidth - 12)),
          width: panelWidth,
          maxHeight: height - top - 24,
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 16,
          gap: 8,
          borderColor: colors.border,
          borderWidth: 1,
        }}
      >
        <View style={s.row}>
          <Copy title style={{ flex: 1 }}>
            Filter items
          </Copy>
          <IconButton icon="close" label="Close filters" onPress={onClose} />
        </View>
        <FlatList
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0, flexShrink: 1 }}
          data={options.filter((option) =>
            option.label.toLowerCase().includes(text.trim().toLowerCase()),
          )}
          keyExtractor={(option) => option.value}
          ListHeaderComponent={
            <View>
              <SelectionRow
                title="Category"
                subtitle={query.category ?? 'All categories'}
                icon="pricetag-outline"
                onPress={() => selectFacet('category')}
              />
              {!scopePlaceId && (
                <SelectionRow
                  title="Place · where it lives"
                  subtitle={
                    placePath(query.placeId, data.places) || 'All places'
                  }
                  icon="location-outline"
                  onPress={() => selectFacet('place')}
                />
              )}
              {!scopeFolderId && (
                <SelectionRow
                  title="Folder · your personal group"
                  subtitle={
                    query.folderId === 'unfiled'
                      ? 'Unfiled'
                      : folderPath(query.folderId, data.folders) ||
                        'All folders'
                  }
                  icon="folder-outline"
                  onPress={() => selectFacet('folder')}
                />
              )}
              {(scopePlaceId || query.placeId) && (
                <View style={s.row}>
                  <Copy style={{ flex: 1 }}>Include subplaces</Copy>
                  <Switch
                    accessibilityLabel="Include subplaces"
                    value={query.includeSubplaces ?? query.includeDescendants}
                    onValueChange={(includeSubplaces) =>
                      change({ includeSubplaces })
                    }
                  />
                </View>
              )}
              {(scopeFolderId || query.folderId) &&
                (scopeFolderId ?? query.folderId) !== 'unfiled' && (
                  <View style={s.row}>
                    <Copy style={{ flex: 1 }}>Include subfolders</Copy>
                    <Switch
                      accessibilityLabel="Include subfolders"
                      value={
                        query.includeSubfolders ?? query.includeDescendants
                      }
                      onValueChange={(includeSubfolders) =>
                        change({ includeSubfolders })
                      }
                    />
                  </View>
                )}
              {facet && (
                <View style={{ gap: 8, marginTop: 12 }}>
                  <Copy style={{ fontWeight: '700' }}>Choose {facet}</Copy>
                  <SearchBox
                    label={`Search ${facet} choices`}
                    value={text}
                    onChangeText={setText}
                    placeholder={`Search ${facet} choices…`}
                  />
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <SelectionRow
              title={`${(facet === 'category' ? query.category : facet === 'place' ? query.placeId : query.folderId) === (item.value || undefined) ? '✓ ' : ''}${item.label}`}
              icon={item.icon ?? 'pricetag-outline'}
              onPress={() => {
                if (facet === 'category')
                  change({
                    category: (item.value || undefined) as
                      Category | 'uncategorized' | undefined,
                  });
                if (facet === 'place')
                  change({ placeId: item.value || undefined });
                if (facet === 'folder')
                  change({ folderId: item.value || undefined });
                setFacet(undefined);
                setText('');
              }}
            />
          )}
          ListEmptyComponent={
            facet ? (
              <Copy muted style={{ marginTop: 12 }}>
                No matching choices.
              </Copy>
            ) : undefined
          }
        />
        <View style={s.row}>
          <Pressable
            accessibilityRole="button"
            onPress={reset}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Copy>Reset filters</Copy>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Copy style={{ color: colors.primary, fontWeight: '700' }}>
              Done
            </Copy>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
