import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  View,
} from 'react-native';
import { useMemory } from '../hooks/useMemory';
import { useMotion } from '../hooks/useMotion';
import { containsPlace, placePath } from '../utils/memory';
import { validIcon } from '../utils/icons';
import { placeIcon } from './PlaceCard';
import { PlaceSuggestions } from './PlaceSuggestions';
import { ChoiceSheet, SearchBox, SelectionRow } from './controls';
import {
  Button,
  Copy,
  ErrorMessage,
  Field,
  IconButton,
  Screen,
  s,
  type IconName,
} from './ui';
export function PlacePicker({
  value,
  onChange,
  exclude,
  compact = false,
}: {
  value?: string;
  onChange(id?: string): void;
  exclude?: string;
  compact?: boolean;
}) {
  const { data, repository } = useMemory();
  const motion = useMotion();
  const [open, setOpen] = useState(false),
    [adding, setAdding] = useState(false),
    [parents, setParents] = useState(false);
  const [text, setText] = useState(''),
    [name, setName] = useState('');
  const [parent, setParent] = useState<string>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string>();
  const selected = data.places.find((place) => place.id === value);
  const places = data.places
    .filter(
      (place) => !exclude || !containsPlace(place.id, exclude, data.places),
    )
    .sort((a, b) =>
      placePath(a.id, data.places).localeCompare(placePath(b.id, data.places)),
    );
  const close = () => {
    if (!lock.current) {
      setOpen(false);
      setAdding(false);
      setParents(false);
      setError(undefined);
    }
  };
  return (
    <>
      <SelectionRow
        title={selected?.name ?? 'Choose a place'}
        subtitle={
          selected
            ? placePath(selected.parentId, data.places) ||
              (compact ? 'Place' : 'Tap to change')
            : 'Or use a position only'
        }
        icon={
          validIcon(
            selected?.icon,
            selected ? placeIcon(selected.name) : 'location-outline',
          ) as IconName
        }
        onPress={() => {
          setText('');
          setOpen(true);
        }}
      />
      <Modal
        visible={open}
        animationType={motion ? 'slide' : 'none'}
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Screen scroll={adding}>
            <View style={s.row}>
              <Copy title style={{ flex: 1 }}>
                {adding ? 'Create place' : 'Choose a place'}
              </Copy>
              <IconButton
                icon="close"
                label="Close place picker"
                onPress={close}
              />
            </View>
            {adding ? (
              <>
                <Field
                  label="Place name"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  placeholder="Room, shelf, bag…"
                />
                <PlaceSuggestions onSelect={setName} />
                <SelectionRow
                  title="Inside"
                  subtitle={placePath(parent, data.places) || 'Top level'}
                  icon="location-outline"
                  onPress={() => setParents(true)}
                />
                <ErrorMessage message={error} />
                <Button
                  title="Create place"
                  busy={busy}
                  onPress={() => {
                    if (lock.current) return;
                    lock.current = true;
                    setBusy(true);
                    setError(undefined);
                    void repository
                      .savePlace(name, parent)
                      .then((id) => {
                        onChange(id);
                        setOpen(false);
                        setAdding(false);
                      })
                      .catch((e) => setError(e.message))
                      .finally(() => {
                        lock.current = false;
                        setBusy(false);
                      });
                  }}
                />
                <Button
                  secondary
                  title="Back to places"
                  disabled={busy}
                  onPress={() => setAdding(false)}
                />
              </>
            ) : (
              <>
                <SearchBox
                  value={text}
                  onChangeText={setText}
                  label="Search places"
                  placeholder="Search rooms, shelves, bags…"
                />
                <Button
                  secondary
                  title="Create place"
                  icon="add"
                  onPress={() => {
                    setParent(value);
                    setName('');
                    setAdding(true);
                  }}
                />
                <FlatList
                  data={[
                    { id: '', name: 'Use position only' },
                    ...places,
                  ].filter(
                    (place) =>
                      !place.id ||
                      placePath(place.id, data.places)
                        .toLowerCase()
                        .includes(text.trim().toLowerCase()),
                  )}
                  keyExtractor={(place) => place.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <SelectionRow
                      title={item.name}
                      subtitle={
                        item.id
                          ? placePath(item.id, data.places)
                          : 'No named place'
                      }
                      icon={
                        validIcon(
                          data.places.find((place) => place.id === item.id)
                            ?.icon,
                          placeIcon(item.name),
                        ) as IconName
                      }
                      onPress={() => {
                        onChange(item.id || undefined);
                        close();
                      }}
                    />
                  )}
                  ListFooterComponent={
                    places.length === 0 ? (
                      <Copy muted>
                        No places yet. Create a room or container, or use a
                        position only.
                      </Copy>
                    ) : undefined
                  }
                />
              </>
            )}
            <ChoiceSheet
              visible={parents}
              title="Parent place"
              searchable
              options={[
                { value: '', label: 'Top level' },
                ...places.map((place) => ({
                  value: place.id,
                  label: placePath(place.id, data.places),
                })),
              ]}
              selected={parent ?? ''}
              onSelect={(id) => setParent(id || undefined)}
              onClose={() => setParents(false)}
            />
          </Screen>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
