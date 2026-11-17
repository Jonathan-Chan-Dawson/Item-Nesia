import { useEffect, useState } from 'react';
import { Animated, Pressable } from 'react-native';
import type { Item } from '../types/models';
import { useMemory } from '../hooks/useMemory';
import { useMotion } from '../hooks/useMotion';
import { Copy, Icon } from './ui';
export function StarButton({ item }: { item: Item }) {
  const { repository } = useMemory();
  const motion = useMotion();
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!motion) {
      scale.stopAnimation();
      scale.setValue(1);
    }
    return () => scale.stopAnimation();
  }, [motion, scale]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.isFavorite ? 'Unstar' : 'Star'} ${item.name}`}
      accessibilityState={{
        selected: item.isFavorite,
        disabled: busy || !!item.deletedAt,
      }}
      disabled={busy || !!item.deletedAt}
      onPress={(event) => {
        event.stopPropagation();
        setBusy(true);
        setError(false);
        void repository
          .updateItem(item.id, { isFavorite: !item.isFavorite })
          .then(() => {
            if (motion)
              Animated.sequence([
                Animated.timing(scale, {
                  toValue: 1.2,
                  duration: 90,
                  useNativeDriver: true,
                }),
                Animated.timing(scale, {
                  toValue: 1,
                  duration: 90,
                  useNativeDriver: true,
                }),
              ]).start();
          })
          .catch(() => setError(true))
          .finally(() => setBusy(false));
      }}
      style={{
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name={item.isFavorite ? 'star' : 'star-outline'} size={21} />
      </Animated.View>
      {error && <Copy style={{ fontSize: 9 }}>Try again</Copy>}
    </Pressable>
  );
}
