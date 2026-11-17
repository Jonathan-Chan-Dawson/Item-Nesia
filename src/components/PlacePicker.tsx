import { View, Pressable } from 'react-native';
import { useRef, useState } from 'react';
import { useMemory, useTheme } from '../hooks/useMemory';
import { Button, Copy, ErrorMessage, Field, Panel, s } from './ui';
import { ChoiceSheet, SelectionRow } from './controls';
import { placeIcon } from './PlaceCard';
import { containsPlace, placePath } from '../utils/memory';

export function PlacePicker({
  value,
  onChange,
  exclude,
}: {
  value?: string;
  onChange(id?: string): void;
  exclude?: string;
}) {
  const { data, repository } = useMemory();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string>();
  const selected = data.places.find((place) => place.id === value);
  const places = data.places
    .filter(
      (place) => !exclude || !containsPlace(place.id, exclude, data.places),
    )
    .sort((a, b) =>
      placePath(a.id, data.places).localeCompare(placePath(b.id, data.places)),
    );
  return (
    <View style={{ gap: 10 }}>
      <Panel>
        <SelectionRow
          title={selected?.name ?? 'Choose a place'}
          subtitle={
            selected?.parentId
              ? placePath(selected.parentId, data.places)
              : selected
                ? 'Tap to change the saved place'
                : 'A room, drawer, bag, or anywhere else'
          }
          icon={selected ? placeIcon(selected.name) : 'file-tray-outline'}
          onPress={() => setOpen(true)}
        />
      </Panel>
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <Copy muted style={{ fontSize: 12, lineHeight: 19, flex: 1 }}>
          Or describe the exact spot below.
        </Copy>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAdding(!adding)}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: 5,
          }}
        >
          <Copy
            style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}
          >
            {adding ? 'Cancel' : '+ New place'}
          </Copy>
        </Pressable>
      </View>
      {adding && (
        <Panel>
          <Copy muted style={{ fontSize: 12 }}>
            {selected
              ? `Create inside ${placePath(value, data.places)}`
              : 'Create a new top-level place'}
          </Copy>
          <Field
            label="New place name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bedroom or top drawer"
          />
          <Button
            title="Create place"
            busy={busy}
            onPress={() => {
              if (saving.current) return;
              saving.current = true;
              setBusy(true);
              setError(undefined);
              void repository
                .savePlace(name, value)
                .then((id) => {
                  onChange(id);
                  setName('');
                  setAdding(false);
                })
                .catch((e) => setError(e.message))
                .finally(() => {
                  saving.current = false;
                  setBusy(false);
                });
            }}
          />
          <ErrorMessage message={error} />
        </Panel>
      )}
      <ChoiceSheet
        visible={open}
        title="Choose a place"
        searchable
        selected={value ?? ''}
        options={[
          {
            value: '',
            label: 'No place selected',
            detail: 'Use an exact spot instead',
            icon: 'remove-circle-outline',
          },
          ...places.map((place) => ({
            value: place.id,
            label: place.name,
            detail: place.parentId
              ? placePath(place.parentId, data.places)
              : undefined,
            icon: placeIcon(place.name),
          })),
        ]}
        onSelect={(id) => onChange(id || undefined)}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
