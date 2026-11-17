import { useState } from 'react';
import { View } from 'react-native';
import { useMemory } from '../hooks/useMemory';
import { Button, Copy, ErrorMessage, confirm } from './ui';
export function OrganizeSamples() {
  const { data, repository } = useMemory();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const count = data.items.filter(
    (item) =>
      item.isDemo &&
      !item.folderId &&
      !item.deletedAt &&
      /^demo-item-\d+$/.test(item.id) &&
      Number(item.id.slice(10)) < 54,
  ).length;
  if (!count) return done ? <Copy muted>Sample folders are ready.</Copy> : null;
  return (
    <View style={{ gap: 8 }}>
      <Button
        secondary
        title={`Organize ${count} sample items`}
        icon="folder-open-outline"
        busy={busy}
        onPress={() => {
          void confirm(
            'Organize sample items?',
            `${count} Unfiled samples will go into example folders such as Travel and Camping. Personal items, assigned folders, and saved locations stay the same.`,
          ).then(async (yes) => {
            if (!yes) return;
            setBusy(true);
            setError(undefined);
            try {
              await repository.organizeSamples();
              setDone(true);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : 'Could not organize samples.',
              );
            } finally {
              setBusy(false);
            }
          });
        }}
      />
      <ErrorMessage message={error} />
    </View>
  );
}
