import { Pressable, ScrollView, View } from 'react-native';
import { placeIcon } from './PlaceCard';
import { Copy, Icon } from './ui';
import { useTheme } from '../hooks/useMemory';
export const suggestedPlaces = [
  'Bedroom',
  'Bathroom',
  'Kitchen',
  'Living Room',
  'Office',
  'Garage',
  'Attic',
  'Outdoors',
  'Car',
  'Backpack',
  'Closet',
  'Shelf',
  'Drawer',
  'Storage box',
];
export function PlaceSuggestions({
  onSelect,
}: {
  onSelect(name: string): void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Copy muted style={{ fontSize: 12 }}>
        Suggestions · choose a name, then save to create it.
      </Copy>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {suggestedPlaces.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={`Use place name ${name}`}
            onPress={() => onSelect(name)}
            style={{
              minHeight: 44,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              gap: 6,
              borderRadius: 12,
              paddingHorizontal: 12,
              backgroundColor: colors.soft,
            }}
          >
            <Icon name={placeIcon(name)} size={16} />
            <Copy>{name}</Copy>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
