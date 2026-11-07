import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemory, useTheme } from '../hooks/useMemory';
import type { Item } from '../types/models';
import { locationLabel } from '../utils/memory';
import { Copy, Icon, type IconName } from './ui';

const icons: Record<string, IconName> = {
  Electronics: 'headset-outline',
  Documents: 'document-text-outline',
  Accessories: 'wallet-outline',
  Clothing: 'shirt-outline',
  Household: 'home-outline',
  Tools: 'hammer-outline',
  Hobbies: 'game-controller-outline',
};
export function ItemPhoto({
  item,
  height = 150,
}: {
  item: Item;
  height?: number;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState<string>();
  return (
    <View
      style={{
        height,
        borderRadius: 18,
        backgroundColor: colors.soft,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {item.photoUri && failed !== item.photoUri ? (
        <Image
          source={{ uri: item.photoUri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          onError={() => setFailed(item.photoUri)}
          accessibilityLabel={item.name}
        />
      ) : (
        <>
          <Icon
            name={icons[item.category ?? ''] ?? 'cube-outline'}
            size={height > 180 ? 70 : 44}
          />
          <Copy muted style={{ fontSize: 10, marginTop: 8, letterSpacing: 1 }}>
            {item.isDemo ? 'DEMO ITEM' : 'NO PHOTO'}
          </Copy>
        </>
      )}
    </View>
  );
}
export function ItemCard({ item, list }: { item: Item; list?: boolean }) {
  const { data } = useMemory();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
      onPress={() =>
        router.push({ pathname: '/items/[id]', params: { id: item.id } })
      }
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: colors.surface,
        padding: 10,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.65 : 1,
        flexDirection: list ? 'row' : 'column',
        gap: 12,
      })}
    >
      <View style={list ? { width: 78 } : undefined}>
        <ItemPhoto item={item} height={list ? 78 : 150} />
      </View>
      <View style={{ flex: 1, gap: 4, padding: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Copy style={{ fontWeight: '700', flex: 1 }}>{item.name}</Copy>
          {item.isFavorite && <Icon name="heart" size={14} />}
        </View>
        <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
          {locationLabel(item, data.places)}
        </Copy>
      </View>
    </Pressable>
  );
}
