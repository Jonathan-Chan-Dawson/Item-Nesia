import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMemory } from '../hooks/useMemory';
import {
  createBackup,
  readBackup,
  remapPhotos,
  BACKUP_LIMIT,
} from '../utils/backup';
import {
  readBytes,
  readPhoto,
  writePhoto,
  exportArchive,
} from '../services/backupFiles';
import { removePhoto } from '../services/photos';
import { Copy, ErrorMessage, Panel, confirm } from '../components/ui';
import { SelectionRow } from '../components/controls';
export function BackupControls() {
  const { repository } = useMemory();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  async function run(restore: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    const staged: string[] = [];
    try {
      if (!restore) {
        const bytes = await createBackup(
          await repository.snapshot(),
          readPhoto,
        );
        await exportArchive(bytes);
        setMessage(
          Platform.OS === 'web'
            ? 'Backup download started. Keep it somewhere safe.'
            : 'Backup share sheet closed. Make sure you saved the file.',
        );
        return;
      }
      const chosen = await DocumentPicker.getDocumentAsync({
        type: [
          'application/zip',
          'application/x-zip-compressed',
          'application/octet-stream',
        ],
        copyToCacheDirectory: true,
      });
      if (chosen.canceled) return;
      if (
        chosen.assets[0].size !== undefined &&
        chosen.assets[0].size > BACKUP_LIMIT
      )
        throw new Error('Choose an Item-Nesia backup smaller than 64 MB.');
      const bytes = chosen.assets[0].file
        ? new Uint8Array(await chosen.assets[0].file.arrayBuffer())
        : await readBytes(chosen.assets[0].uri);
      const backup = await readBackup(bytes);
      if (
        !(await confirm(
          'Replace current memories?',
          `This checked backup contains ${backup.data.items.length} items, ${backup.data.folders.length} folders, ${backup.data.places.length} places, and ${backup.photos.size} photos. It will REPLACE all current records and photos. Export a backup first if you want to keep them.`,
        ))
      )
        return;
      const map = new Map<string, string>();
      for (const [path, photo] of backup.photos) {
        const uri = await writePhoto(photo);
        staged.push(uri);
        map.set(path, uri);
      }
      await repository.replace(remapPhotos(backup.data, map));
      staged.length = 0;
      setMessage('Backup restored, including photos and folders.');
    } catch (e) {
      await Promise.allSettled(staged.map(removePhoto));
      setError(e instanceof Error ? e.message : 'Backup operation failed.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Panel>
      <SelectionRow
        title="Create full backup"
        subtitle="Items, folders, settings, history, and photos in one ZIP."
        icon="download-outline"
        disabled={busy}
        onPress={() => {
          void run(false);
        }}
      />
      <SelectionRow
        title="Restore full backup"
        subtitle="Preview a backup before replacing current memories."
        icon="cloud-upload-outline"
        disabled={busy}
        onPress={() => {
          void run(true);
        }}
      />
      <Copy muted style={{ fontSize: 12 }}>
        {busy
          ? 'Working… Please keep this screen open.'
          : 'Offline · 64 MB per backup · 20 MB per photo. Backups are not encrypted.'}
      </Copy>
      {message && <Copy>{message}</Copy>}
      <ErrorMessage message={error} />
    </Panel>
  );
}
