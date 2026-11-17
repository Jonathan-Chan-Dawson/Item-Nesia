import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import type { LocationSnapshot } from '../types/models';
import { useMemory, useTheme } from '../hooks/useMemory';
import { validIcon } from '../utils/icons';
import { placeIcon } from './PlaceCard';
import { LocationPhoto } from './LocationPhoto';
import { Copy, Icon, IconButton, Screen, s, type IconName } from './ui';
export function LocationSummary({
  snapshot,
  label,
  stacked = false,
}: {
  snapshot: LocationSnapshot;
  label?: string;
  stacked?: boolean;
}) {
  const { data } = useMemory();
  const { colors } = useTheme();
  const [photo, setPhoto] = useState(false);
  const place = data.places.find((place) => place.id === snapshot.placeId);
  return (
    <View style={{ gap: 6 }}>
      <View
        style={[
          s.row,
          {
            gap: 10,
            justifyContent: 'flex-start',
            flexDirection: stacked ? 'column' : 'row',
            alignItems: stacked ? 'flex-start' : 'center',
          },
        ]}
      >
        {!stacked && (
          <Icon
            name={
              validIcon(place?.icon, placeIcon(place?.name ?? '')) as IconName
            }
            size={20}
          />
        )}
        <View style={stacked ? { width: '100%' } : { flex: 1 }}>
          <Copy muted style={{ fontSize: 11, lineHeight: 16 }}>
            {label ?? 'Location'}
          </Copy>
          <Copy style={{ fontSize: 14, lineHeight: 19, fontWeight: '600' }}>
            {snapshot.path || 'Position only'}
          </Copy>
          {snapshot.position && (
            <Copy muted style={{ fontSize: 13, lineHeight: 18 }}>
              {snapshot.position}
            </Copy>
          )}
        </View>
        {snapshot.photoUri && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${label ?? 'location'} photo`}
            onPress={() => setPhoto(true)}
            style={{
              minWidth: 48,
              width: stacked ? '100%' : undefined,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={{ uri: snapshot.photoUri }}
              contentFit="cover"
              style={{
                width: stacked ? '100%' : 44,
                height: stacked ? 88 : 44,
                borderRadius: 10,
                backgroundColor: colors.soft,
              }}
            />
          </Pressable>
        )}
      </View>
      <Modal visible={photo} onRequestClose={() => setPhoto(false)}>
        <Screen>
          <View style={s.row}>
            <Copy title style={{ flex: 1 }}>
              {label ?? 'Location photo'}
            </Copy>
            <IconButton
              icon="close"
              label="Close location photo"
              onPress={() => setPhoto(false)}
            />
          </View>
          {snapshot.photoUri && (
            <LocationPhoto
              uri={snapshot.photoUri}
              x={snapshot.pinX}
              y={snapshot.pinY}
              enlarged
            />
          )}
        </Screen>
      </Modal>
    </View>
  );
}
