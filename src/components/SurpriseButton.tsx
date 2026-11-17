import { useRef } from 'react';
import { router } from 'expo-router';
import type { Item } from '../types/models';
import { randomItem } from '../utils/inventory';
import { Button, Copy } from './ui';
import { View } from 'react-native';
export function SurpriseButton({ items }: { items: Item[] }) {
  const previous = useRef<string | undefined>(undefined);
  const available = items.some((item) => !item.isArchived && !item.deletedAt);
  return (
    <View style={{ gap: 4 }}>
      <Button
        secondary
        title="Surprise me"
        icon="dice-outline"
        disabled={!available}
        onPress={() => {
          const item = randomItem(items, previous.current);
          if (item) {
            previous.current = item.id;
            router.push({ pathname: '/items/[id]', params: { id: item.id } });
          }
        }}
      />
      {!available && (
        <Copy muted style={{ fontSize: 12 }}>
          No active items in this view to discover yet.
        </Copy>
      )}
    </View>
  );
}
