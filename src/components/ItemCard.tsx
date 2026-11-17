import { StarButton } from './StarButton';
import { ItemCardActions } from './ItemCardActions';
import { validIcon } from '../utils/icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemory, useTheme } from '../hooks/useMemory';
import type { Item } from '../types/models';
import { locationLabel } from '../utils/memory';
import { Copy, Icon, type IconName } from './ui';

const categoryArt: Record<
  string,
  { icon: IconName; light: string; ink: string; dark: string }
> = {
  Electronics: {
    icon: 'headset-outline',
    light: '#E9EAEF',
    ink: '#5D637F',
    dark: '#2D303D',
  },
  Documents: {
    icon: 'document-text-outline',
    light: '#F3EAD8',
    ink: '#967448',
    dark: '#3C3427',
  },
  Accessories: {
    icon: 'wallet-outline',
    light: '#E0ECEA',
    ink: '#4F7F75',
    dark: '#273D37',
  },
  Clothing: {
    icon: 'shirt-outline',
    light: '#EFE4E3',
    ink: '#A06A66',
    dark: '#3F2E2C',
  },
  Household: {
    icon: 'home-outline',
    light: '#E7EBD9',
    ink: '#75804D',
    dark: '#343B28',
  },
  'Kitchen & Dining': {
    icon: 'restaurant-outline',
    light: '#F2E7DB',
    ink: '#8A6C48',
    dark: '#3B3126',
  },
  Tools: {
    icon: 'hammer-outline',
    light: '#F0E5D9',
    ink: '#97714A',
    dark: '#3C3227',
  },
  Hobbies: {
    icon: 'game-controller-outline',
    light: '#EAE4EE',
    ink: '#826893',
    dark: '#362C3E',
  },
  'Personal Care': {
    icon: 'cut-outline',
    light: '#E0ECEA',
    ink: '#4F7F75',
    dark: '#273D37',
  },
  'Health & Wellness': {
    icon: 'medkit-outline',
    light: '#E0ECEA',
    ink: '#4F7F75',
    dark: '#273D37',
  },
  'Sports & Outdoors': {
    icon: 'bicycle-outline',
    light: '#E0ECEA',
    ink: '#4F7F75',
    dark: '#273D37',
  },
  Stationery: {
    icon: 'pencil-outline',
    light: '#E0ECEA',
    ink: '#4F7F75',
    dark: '#273D37',
  },
  'Pet Supplies': {
    icon: 'paw-outline',
    light: '#E0ECEA',
    ink: '#4F7F75',
    dark: '#273D37',
  },
  'Cleaning & Laundry': {
    icon: 'water-outline',
    light: '#E0ECEA',
    ink: '#4F7F75',
    dark: '#273D37',
  },
  Seasonal: {
    icon: 'gift-outline',
    light: '#E0ECEA',
    ink: '#4F7F75',
    dark: '#273D37',
  },
  Other: {
    icon: 'cube-outline',
    light: '#E0ECEA',
    ink: '#4F7F75',
    dark: '#273D37',
  },
};
export function itemIcon(item: Item): IconName {
  if (item.icon) return validIcon(item.icon) as IconName;
  if (/cable/i.test(item.name)) return 'git-merge-outline';
  if (/battery|charger/i.test(item.name)) return 'battery-charging-outline';
  if (/keys/i.test(item.name)) return 'key-outline';
  if (/\bphone\b/i.test(item.name)) return 'phone-portrait-outline';
  if (/glasses/i.test(item.name)) return 'glasses-outline';
  if (/drive/i.test(item.name)) return 'save-outline';
  if (/receipt/i.test(item.name)) return 'receipt-outline';
  return categoryArt[item.category ?? '']?.icon ?? 'cube-outline';
}
export function ItemPhoto({
  item,
  height = 142,
}: {
  item: Item;
  height?: number;
}) {
  const { colors, dark } = useTheme();
  const [failed, setFailed] = useState<string>();
  const art =
    categoryArt[item.category ?? 'Accessories'] ?? categoryArt.Accessories;
  const hasPhoto = item.photoUri && failed !== item.photoUri;
  const small = height < 100;
  return (
    <View
      style={{
        height,
        borderRadius: small ? 14 : 16,
        backgroundColor: dark ? art.dark : art.light,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {hasPhoto ? (
        <Image
          source={{ uri: item.photoUri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          onError={() => setFailed(item.photoUri)}
          accessibilityLabel={item.name}
        />
      ) : (
        <>
          {!small && (
            <View
              style={{
                position: 'absolute',
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: dark ? '#FFFFFF05' : '#FFFFFF55',
                right: -55,
                top: -65,
              }}
            />
          )}
          <View
            style={{
              transform: [{ rotate: small ? '0deg' : '-8deg' }],
              borderRadius: 22,
              padding: small ? 6 : 16,
              backgroundColor: dark ? '#FFFFFF08' : '#FFFFFF66',
            }}
          >
            <Icon
              name={itemIcon(item)}
              size={small ? 30 : height > 180 ? 72 : 49}
              color={dark ? colors.secondary : art.ink}
            />
          </View>
          {!small && (
            <Copy
              muted
              style={{
                position: 'absolute',
                bottom: 9,
                fontSize: 9,
                letterSpacing: 1,
                lineHeight: 14,
              }}
            >
              {item.isDemo ? 'SAMPLE ITEM' : 'ADD A PHOTO ANYTIME'}
            </Copy>
          )}
        </>
      )}
    </View>
  );
}
export function ItemCard({
  item,
  list,
  onTrash,
}: {
  item: Item;
  list?: boolean;
  onTrash?(item: Item): void;
}) {
  const { data } = useMemory();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.name}`}
        onPress={() =>
          router.push({ pathname: '/items/[id]', params: { id: item.id } })
        }
        style={({ pressed }) => ({
          flex: 1,
          backgroundColor: colors.surface,
          padding: 7,
          paddingRight: list ? 52 : 7,
          borderRadius: 21,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          flexDirection: list ? 'row' : 'column',
          gap: list ? 12 : 0,
          boxShadow: `0px 3px 12px ${colors.shadow}`,
        })}
      >
        <View style={list ? { width: 72 } : undefined}>
          <ItemPhoto item={item} height={list ? 76 : 142} />
        </View>
        <View
          style={{
            flex: 1,
            gap: 5,
            paddingHorizontal: list ? 0 : 5,
            paddingVertical: list ? 9 : 12,
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Copy
              numberOfLines={2}
              style={{
                fontWeight: '700',
                fontSize: 14,
                lineHeight: 19,
                flex: 1,
              }}
            >
              {item.name}
            </Copy>
          </View>
          <View
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}
          >
            <View style={{ marginTop: 2 }}>
              <Icon
                name="location-outline"
                size={11}
                color={colors.secondary}
              />
            </View>
            <Copy
              muted
              numberOfLines={2}
              style={{ fontSize: 11, lineHeight: 16, flex: 1 }}
            >
              {locationLabel(item, data.places)}
            </Copy>
          </View>
        </View>
        {list && (
          <View style={{ justifyContent: 'center', paddingRight: 6 }}>
            <Icon name="chevron-forward" size={15} color={colors.secondary} />
          </View>
        )}
      </Pressable>
      <View
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          flexDirection: list ? 'column' : 'row',
          backgroundColor: colors.surface,
          borderRadius: 12,
        }}
      >
        {list && <StarButton item={item} />}
        <ItemCardActions item={item} onTrash={onTrash} />
        {!list && <StarButton item={item} />}
      </View>
    </View>
  );
}
