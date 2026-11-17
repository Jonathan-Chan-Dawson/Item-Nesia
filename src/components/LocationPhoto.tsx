import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Button, Copy, Icon, IconButton, Screen, s } from './ui';
import { useTheme } from '../hooks/useMemory';
import { containedImage, imagePoint } from '../utils/pins';
export function LocationPhoto({
  uri,
  x,
  y,
  onChange,
  enlarged = false,
}: {
  uri: string;
  x?: number;
  y?: number;
  onChange?(point?: { x: number; y: number }): void;
  enlarged?: boolean;
}) {
  const { colors } = useTheme();
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [source, setSource] = useState({ uri: '', width: 1, height: 1 });
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const ready = source.uri === uri && !error;
  const rect = containedImage(
    frame.width,
    frame.height,
    source.width,
    source.height,
  );
  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole={onChange ? 'button' : 'image'}
        accessibilityLabel={
          onChange
            ? 'Tap the photo to mark the item location'
            : 'Saved location photo'
        }
        disabled={!onChange || !ready}
        onLayout={(event) => setFrame(event.nativeEvent.layout)}
        onPress={(event) => {
          const point = imagePoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            rect,
          );
          if (point) onChange?.(point);
        }}
        style={{
          height: enlarged ? 460 : 250,
          backgroundColor: colors.subtle,
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri }}
          contentFit="contain"
          style={{ width: '100%', height: '100%' }}
          onLoad={(event) => {
            setError(false);
            setSource({
              uri,
              width: event.source.width,
              height: event.source.height,
            });
          }}
          onError={() => setError(true)}
        />
        {ready && x !== undefined && y !== undefined && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: rect.left + x * rect.width - 13,
              top: rect.top + y * rect.height - 13,
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 3,
              borderColor: '#FFFFFF',
              backgroundColor: '#168B78',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0px 1px 5px #00000066',
            }}
          >
            <Icon name="add" color="#FFFFFF" size={16} />
          </View>
        )}
      </Pressable>
      {error && (
        <Copy muted>
          The photo could not be opened. Replace it to place a pin.
        </Copy>
      )}
      {onChange && (
        <>
          <Copy muted style={{ fontSize: 12 }}>
            Tap the photo to place or reposition the pin. Taps outside the image
            are ignored.
          </Copy>
          <View style={[s.row, { justifyContent: 'flex-start' }]}>
            {(
              ['arrow-back', 'arrow-up', 'arrow-down', 'arrow-forward'] as const
            ).map((icon, index) => (
              <IconButton
                key={icon}
                icon={icon}
                label={`Move pin ${['left', 'up', 'down', 'right'][index]}`}
                onPress={() => {
                  if (ready)
                    onChange({
                      x: Math.max(
                        0,
                        Math.min(
                          1,
                          (x ?? 0.5) +
                            (index === 0 ? -0.05 : index === 3 ? 0.05 : 0),
                        ),
                      ),
                      y: Math.max(
                        0,
                        Math.min(
                          1,
                          (y ?? 0.5) +
                            (index === 1 ? -0.05 : index === 2 ? 0.05 : 0),
                        ),
                      ),
                    });
                }}
              />
            ))}
          </View>
          {x !== undefined && (
            <Button
              secondary
              title="Remove pin"
              onPress={() => onChange(undefined)}
            />
          )}
        </>
      )}
      {!onChange && !enlarged && (
        <Button
          secondary
          title="Enlarge location photo"
          icon="expand-outline"
          onPress={() => setOpen(true)}
        />
      )}
      <Modal
        visible={open}
        onRequestClose={() => setOpen(false)}
        animationType="fade"
      >
        <Screen>
          <Button
            secondary
            title="Close photo"
            onPress={() => setOpen(false)}
          />
          <LocationPhoto uri={uri} x={x} y={y} enlarged />
        </Screen>
      </Modal>
    </View>
  );
}
