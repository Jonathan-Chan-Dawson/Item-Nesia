import { useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { useMemory } from '../hooks/useMemory';
import {
  Button,
  Copy,
  ErrorMessage,
  Field,
  IconButton,
  Screen,
  confirm,
  s,
} from './ui';
import { FolderPicker } from './FolderPicker';
export function FolderEditor({
  id,
  parentId,
  onClose,
}: {
  id?: string;
  parentId?: string;
  onClose(): void;
}) {
  const { data, repository } = useMemory();
  const folder = data.folders.find((f) => f.id === id);
  const [name, setName] = useState(folder?.name ?? '');
  const [parent, setParent] = useState(folder?.parentId ?? parentId);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function cancel() {
    if (lock.current) return;
    if (
      (name !== (folder?.name ?? '') ||
        parent !== (folder?.parentId ?? parentId)) &&
      !(await confirm(
        'Discard folder changes?',
        'Your unsaved folder changes will be lost.',
      ))
    )
      return;
    onClose();
  }
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        void cancel();
      }}
    >
      <Screen>
        <View style={s.row}>
          <Copy title style={{ flex: 1 }}>
            {id ? 'Edit folder' : 'New folder'}
          </Copy>
          <IconButton
            icon="close"
            label="Cancel folder editing"
            onPress={() => {
              void cancel();
            }}
          />
        </View>
        <Field
          label="Folder name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Travel essentials"
          autoFocus
        />
        <FolderPicker
          label="Parent folder"
          value={parent}
          onChange={setParent}
          exclude={id}
        />
        <Copy muted style={{ fontSize: 13 }}>
          Folders group belongings. Changing a folder does not change where an
          item is physically stored.
        </Copy>
        <ErrorMessage message={error} />
        <Button
          title="Save folder"
          busy={busy}
          onPress={() => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            void repository
              .saveFolder(name, parent, id)
              .then(onClose)
              .catch((e) => setError(e.message))
              .finally(() => {
                lock.current = false;
                setBusy(false);
              });
          }}
        />
      </Screen>
    </Modal>
  );
}
