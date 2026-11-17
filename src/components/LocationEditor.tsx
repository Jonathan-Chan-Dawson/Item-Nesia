import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useMemory, useTheme } from '../hooks/useMemory';
import type { Item, LocationSnapshot } from '../types/models';
import {
  locationSnapshot,
  positionSuggestions,
  suggestedDestinations,
  locationKey,
  changePlace,
} from '../utils/locations';
import { placePath } from '../utils/memory';
import { validIcon } from '../utils/icons';
import { placeIcon } from './PlaceCard';
import { PlacePicker } from './PlacePicker';
import { LocationPhoto } from './LocationPhoto';
import { PhotoPicker } from './PhotoPicker';
import { ChoiceSheet } from './controls';
import { Button, Copy, Field, Icon, Panel, type IconName } from './ui';
export function LocationEditor({
  value,
  onChange,
  item,
  shortcuts = false,
}: {
  value: LocationSnapshot;
  onChange(value: LocationSnapshot): void;
  item?: Item;
  shortcuts?: boolean;
}) {
  const { data } = useMemory();
  const { colors } = useTheme();
  const [copy, setCopy] = useState(false);
  const suggestions = shortcuts ? suggestedDestinations(data, item) : [];
  const positions = positionSuggestions(
    data,
    value.placeId,
    value.position,
  ).slice(0, 8);
  const place = data.places.find((place) => place.id === value.placeId);
  return (
    <View style={{ gap: 12 }}>
      {!!suggestions.length && (
        <View style={{ gap: 6 }}>
          <Copy muted style={{ fontSize: 12 }}>
            Suggested destinations
          </Copy>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8 }}
          >
            {suggestions.map((destination) => (
              <Pressable
                key={locationKey(destination)}
                accessibilityRole="button"
                accessibilityLabel={`Use destination ${[destination.path, destination.position].filter(Boolean).join(', ')}`}
                onPress={() => onChange(destination)}
                style={{
                  minHeight: 44,
                  maxWidth: 240,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: colors.soft,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon
                  name={
                    validIcon(
                      data.places.find(
                        (place) => place.id === destination.placeId,
                      )?.icon,
                      'location-outline',
                    ) as IconName
                  }
                  size={16}
                />
                <Copy
                  numberOfLines={2}
                  style={{ fontSize: 12, lineHeight: 17, flexShrink: 1 }}
                >
                  {[destination.path, destination.position]
                    .filter(Boolean)
                    .join(' · ')}
                </Copy>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      <Panel>
        <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
          <Icon
            name={
              validIcon(
                place?.icon,
                place ? placeIcon(place.name) : 'location-outline',
              ) as IconName
            }
            size={18}
          />
          <Copy style={{ fontWeight: '700' }}>
            {shortcuts && item ? 'Move to' : 'Location'}
          </Copy>
        </View>
        <PlacePicker
          compact
          value={value.placeId}
          onChange={(placeId) => {
            onChange(changePlace(value, placeId, data.places));
          }}
        />
        <Field
          label="Position"
          placeholder="Shelf, drawer, or exact spot"
          value={value.position ?? ''}
          onChangeText={(position) => onChange({ ...value, position })}
          multiline
        />
        {!!positions.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8 }}
          >
            {positions.map((position) => (
              <Pressable
                key={position.toLowerCase()}
                accessibilityRole="button"
                accessibilityLabel={`Use position ${position}`}
                onPress={() => onChange({ ...value, position })}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: 10,
                  backgroundColor: colors.soft,
                  borderRadius: 12,
                }}
              >
                <Copy style={{ fontSize: 12 }}>{position}</Copy>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <PhotoPicker
          compact
          label="Location photo"
          uri={value.photoUri}
          onChange={(photoUri) =>
            onChange({ ...value, photoUri, pinX: undefined, pinY: undefined })
          }
        >
          {value.photoUri && (
            <LocationPhoto
              key={value.photoUri}
              uri={value.photoUri}
              x={value.pinX}
              y={value.pinY}
              onChange={(point) =>
                onChange({ ...value, pinX: point?.x, pinY: point?.y })
              }
            />
          )}
        </PhotoPicker>
      </Panel>
      {shortcuts && (
        <Button
          secondary
          title="Copy item location"
          icon="copy-outline"
          onPress={() => setCopy(true)}
        />
      )}
      <ChoiceSheet
        visible={copy}
        title="Copy item location"
        searchable
        options={data.items
          .filter(
            (other) =>
              other.id !== item?.id && !other.deletedAt && !other.isArchived,
          )
          .map((other) => ({
            value: other.id,
            label: other.name,
            detail: [placePath(other.placeId, data.places), other.exactSpot]
              .filter(Boolean)
              .join(' · '),
            icon: 'location-outline' as const,
          }))}
        onSelect={(id) => {
          const other = data.items.find((other) => other.id === id);
          if (other) onChange(locationSnapshot(other, data.places));
        }}
        onClose={() => setCopy(false)}
      />
    </View>
  );
}
