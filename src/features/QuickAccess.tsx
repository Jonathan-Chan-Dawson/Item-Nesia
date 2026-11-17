import { useState } from 'react';
import { View } from 'react-native';
import { useMemory } from '../hooks/useMemory';
import { ChoiceSheet } from '../components/controls';
import {
  Button,
  Copy,
  Empty,
  ErrorMessage,
  Header,
  IconButton,
  Panel,
  Screen,
  s,
} from '../components/ui';
import { validIcon } from '../utils/icons';
import type { IconName } from '../components/ui';
import { folderPath } from '../utils/folders';
import { placePath } from '../utils/memory';
import type { QuickAccessRef } from '../types/models';
export function QuickAccess() {
  const { data, repository } = useMemory();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const refs = data.settings.quickAccess;
  const run = (work: Promise<unknown>) => {
    setError(undefined);
    void work.catch((e) => setError(e.message));
  };
  function reorder(index: number, direction: number) {
    const next = [...refs];
    const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    run(repository.settings({ quickAccess: next }));
  }
  return (
    <Screen>
      <Header title="Quick Access" />
      <Copy muted>
        Pin up to four places or folders to Home. Their order here is their
        order on Home.
      </Copy>
      {refs.map((ref, index) => (
        <Panel key={`${ref.kind}:${ref.id}`}>
          <Copy style={{ fontWeight: '700' }}>
            {ref.kind === 'place'
              ? placePath(ref.id, data.places)
              : folderPath(ref.id, data.folders)}
          </Copy>
          <Copy muted>
            {ref.kind === 'place'
              ? 'Place · where things live'
              : 'Folder · how you group things'}
          </Copy>
          <View style={[s.row, { justifyContent: 'flex-start' }]}>
            {index > 0 && (
              <IconButton
                icon="arrow-up"
                label={`Move shortcut ${index + 1} up`}
                onPress={() => reorder(index, -1)}
              />
            )}
            {index < refs.length - 1 && (
              <IconButton
                icon="arrow-down"
                label={`Move shortcut ${index + 1} down`}
                onPress={() => reorder(index, 1)}
              />
            )}
            <IconButton
              icon="close"
              label={`Remove shortcut ${index + 1}`}
              onPress={() => run(repository.toggleShortcut(ref))}
            />
          </View>
        </Panel>
      ))}
      {!refs.length && (
        <Empty
          title="Your familiar places, one tap away."
          message="Add a room, bag, or folder you open often. Nothing is pinned automatically."
        />
      )}
      <Button
        title="Add shortcut"
        icon="add"
        disabled={refs.length === 4}
        onPress={() => setAdding(true)}
      />
      <Button
        secondary
        title="Reset Quick Access"
        disabled={!refs.length}
        onPress={() => run(repository.settings({ quickAccess: [] }))}
      />
      <ErrorMessage message={error} />
      <ChoiceSheet
        visible={adding}
        title="Pin a place or folder"
        searchable
        options={[
          ...data.places.map((p) => ({
            value: `place:${p.id}`,
            label: placePath(p.id, data.places),
            detail: 'Place',
            icon: validIcon(p.icon, 'location-outline') as IconName,
          })),
          ...data.folders.map((f) => ({
            value: `folder:${f.id}`,
            label: folderPath(f.id, data.folders),
            detail: 'Folder',
            icon: validIcon(f.icon, 'folder-outline') as IconName,
          })),
        ].filter(
          (option) =>
            !refs.some((ref) => option.value === `${ref.kind}:${ref.id}`),
        )}
        onClose={() => setAdding(false)}
        onSelect={(value) => {
          const colon = value.indexOf(':');
          run(
            repository.toggleShortcut({
              kind: value.slice(0, colon) as QuickAccessRef['kind'],
              id: value.slice(colon + 1),
            }),
          );
        }}
      />
    </Screen>
  );
}
