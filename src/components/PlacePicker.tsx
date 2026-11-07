import { View } from 'react-native';
import { useState } from 'react';
import { useMemory } from '../hooks/useMemory';
import { Button, Copy, ErrorMessage, Field } from './ui';
import { placePath } from '../utils/memory';

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
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <View style={{ gap: 10 }}>
      <Copy muted>
        Choose a place. New places are added inside the current selection.
      </Copy>
      <Button
        title={value ? 'Clear selection' : 'No place selected'}
        secondary
        onPress={() => onChange(undefined)}
      />
      {data.places
        .filter((p) => p.id !== exclude)
        .sort((a, b) =>
          placePath(a.id, data.places).localeCompare(
            placePath(b.id, data.places),
          ),
        )
        .map((place) => (
          <Button
            key={place.id}
            title={placePath(place.id, data.places)}
            secondary={value !== place.id}
            icon={value === place.id ? 'checkmark' : 'file-tray-outline'}
            onPress={() => onChange(place.id)}
          />
        ))}
      <Button
        title={adding ? 'Cancel new place' : 'New place'}
        icon="add"
        secondary
        onPress={() => setAdding(!adding)}
      />
      {adding && (
        <>
          <Field label="New place name" value={name} onChangeText={setName} />
          <Button
            title="Create place"
            busy={busy}
            onPress={() => {
              if (busy) return;
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
                .finally(() => setBusy(false));
            }}
          />
          <ErrorMessage message={error} />
        </>
      )}
    </View>
  );
}
