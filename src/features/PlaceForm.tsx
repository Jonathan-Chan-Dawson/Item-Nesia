import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { useMemory } from '../hooks/useMemory';
import {
  Button,
  Copy,
  Empty,
  ErrorMessage,
  Field,
  Header,
  Screen,
} from '../components/ui';
import { PlacePicker } from '../components/PlacePicker';

export function PlaceForm({ id }: { id?: string }) {
  const { data, repository } = useMemory();
  const place = data.places.find((p) => p.id === id);
  const [name, setName] = useState(place?.name ?? '');
  const [parent, setParent] = useState(place?.parentId);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string>();
  if (id && !place)
    return (
      <Screen>
        <Header title="Place unavailable" />
        <Empty
          title="This place isn’t here."
          message="Return to My Places to choose another."
        />
      </Screen>
    );
  return (
    <Screen>
      <Header title={id ? 'Edit Place' : 'New Place'} />
      <Field
        label="Place name"
        placeholder="Bedroom, backpack, top drawer…"
        value={name}
        onChangeText={setName}
      />
      <Copy title>Inside another place?</Copy>
      <PlacePicker value={parent} onChange={setParent} exclude={id} />
      <ErrorMessage message={error} />
      <Button
        title="Save Place"
        busy={busy}
        onPress={() => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError(undefined);
          void repository
            .savePlace(name, parent, id)
            .then((saved) =>
              router.replace({
                pathname: '/places/[id]',
                params: { id: saved },
              }),
            )
            .catch((e) => setError(e.message))
            .finally(() => {
              lock.current = false;
              setBusy(false);
            });
        }}
      />
    </Screen>
  );
}
