import { Header, Screen, Copy } from '../components/ui';
import { BackupControls } from '../features/BackupControls';
export default function Backups() {
  return (
    <Screen>
      <Header title="Backups" />
      <Copy muted>
        Keep a full copy of your items, photos, folders, icons, and Trash
        somewhere safe.
      </Copy>
      <BackupControls />
    </Screen>
  );
}
