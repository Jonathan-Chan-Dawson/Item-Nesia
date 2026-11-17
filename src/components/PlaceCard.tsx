import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useMemory, useTheme } from '../hooks/useMemory';
import type { Place } from '../types/models';
import { containsPlace, placePath } from '../utils/memory';
import { Copy, Icon, s, type IconName } from './ui';

export function placeIcon(name: string): IconName {
  const normalized = name.toLowerCase();
  if (/bed|sleep/.test(normalized)) return 'bed-outline';
  if (/backpack|bag/.test(normalized)) return 'bag-handle-outline';
  if (/kitchen/.test(normalized)) return 'restaurant-outline';
  if (/car/.test(normalized)) return 'car-outline';
  if (/office|desk/.test(normalized)) return 'desktop-outline';
  if (/garage/.test(normalized)) return 'build-outline';
  if (/living/.test(normalized)) return 'home-outline';
  return 'file-tray-outline';
}
export function PlaceCard({
  place,
  compact,
}: {
  place: Place;
  compact?: boolean;
}) {
  const { data } = useMemory();
  const { colors } = useTheme();
  const count = data.items.filter(
    (item) =>
      !item.isArchived && containsPlace(item.placeId, place.id, data.places),
  ).length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${placePath(place.id, data.places)}, ${count} ${count === 1 ? 'item' : 'items'}`}
      onPress={() =>
        router.push({ pathname: '/places/[id]', params: { id: place.id } })
      }
      style={({ pressed }) => ({
        width: compact ? 146 : undefined,
        padding: compact ? 16 : 18,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        backgroundColor: colors.surface,
        gap: 14,
        opacity: pressed ? 0.65 : 1,
        boxShadow: `0px 3px 12px ${colors.shadow}`,
      })}
    >
      <View
        style={[
          s.row,
          { justifyContent: compact ? 'space-between' : 'flex-start' },
        ]}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: colors.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={placeIcon(place.name)} size={23} />
        </View>
        {!compact && (
          <View style={{ flex: 1 }}>
            <Copy style={{ fontWeight: '700' }}>{place.name}</Copy>
            {place.parentId && (
              <Copy muted numberOfLines={1} style={{ fontSize: 12 }}>
                {placePath(place.parentId, data.places)}
              </Copy>
            )}
          </View>
        )}
        <Icon name="chevron-forward" size={15} color={colors.secondary} />
      </View>
      <View style={{ gap: 2 }}>
        {compact && (
          <Copy numberOfLines={1} style={{ fontWeight: '700' }}>
            {place.name}
          </Copy>
        )}
        <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
          {count} {count === 1 ? 'item' : 'items'}
          {!compact && ' · including subplaces'}
        </Copy>
      </View>
    </Pressable>
  );
}
