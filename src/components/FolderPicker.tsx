import { useState } from 'react';
import { useMemory } from '../hooks/useMemory';
import { ChoiceSheet, SelectionRow } from './controls';
import { folderPath, inFolder } from '../utils/folders';
import { Button, ErrorMessage, Field, Panel } from './ui';
export function FolderPicker({
  value,
  onChange,
  exclude,
  label = 'Folder',
}: {
  value?: string;
  onChange(id?: string): void;
  exclude?: string;
  label?: string;
}) {
  const { data, repository } = useMemory();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <>
      <SelectionRow
        title={label}
        subtitle={folderPath(value, data.folders) || 'Unfiled'}
        icon="folder-outline"
        onPress={() => setOpen(true)}
      />
      {label === 'Folder' && (
        <Button
          secondary
          title={adding ? 'Cancel new folder' : 'New folder'}
          icon="folder-outline"
          onPress={() => setAdding(!adding)}
        />
      )}
      {adding && (
        <Panel>
          <Field label="New folder name" value={name} onChangeText={setName} />
          <Button
            title="Create folder"
            busy={busy}
            onPress={() => {
              setBusy(true);
              setError(undefined);
              void repository
                .saveFolder(name, value)
                .then((id) => {
                  onChange(id);
                  setAdding(false);
                  setName('');
                })
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          />
          <ErrorMessage message={error} />
        </Panel>
      )}
      <ChoiceSheet
        visible={open}
        title="Choose a folder"
        selected={value ?? ''}
        options={[
          {
            value: '',
            label: 'Unfiled / top level',
            icon: 'folder-open-outline',
          },
          ...data.folders
            .filter((f) => !exclude || !inFolder(f.id, exclude, data.folders))
            .map((f) => ({
              value: f.id,
              label: folderPath(f.id, data.folders),
              icon: 'folder-outline' as const,
            })),
        ]}
        onSelect={(id) => onChange(id || undefined)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
