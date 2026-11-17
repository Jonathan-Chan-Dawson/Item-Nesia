import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { Item } from '../types/models';
import { useMemory, useTheme } from '../hooks/useMemory';
import { locationLabel } from '../utils/memory';
import { Copy } from './ui';
import { StarButton } from './StarButton';
export function StarredCard({ item }: { item: Item }) {
  const { data } = useMemory();
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open starred item ${item.name}`}
        onPress={() =>
          router.push({ pathname: '/items/[id]', params: { id: item.id } })
        }
        style={{ flex: 1, minHeight: 56, gap: 4, justifyContent: 'center' }}
      >
        <Copy
          numberOfLines={2}
          style={{ fontSize: 13, lineHeight: 18, fontWeight: '700' }}
        >
          {item.name}
        </Copy>
        <Copy muted numberOfLines={1} style={{ fontSize: 10, lineHeight: 14 }}>
          {locationLabel(item, data.places)}
        </Copy>
      </Pressable>
      <StarButton item={item} />
    </View>
  );
}
