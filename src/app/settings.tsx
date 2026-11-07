import { useState } from 'react';
import { Platform, Share, Switch, View } from 'react-native';
import {
  Button,
  confirm,
  Copy,
  ErrorMessage,
  Header,
  Panel,
  Screen,
  Section,
  s,
} from '../components/ui';
import { useMemory, useTheme } from '../hooks/useMemory';
import type { Settings } from '../types/models';

export default function SettingsScreen() {
  const { data, repository } = useMemory();
  const { colors } = useTheme();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const update = (patch: Partial<Settings>) => {
    setError(undefined);
    void repository.settings(patch).catch((e) => setError(e.message));
  };
  const action = (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    void work()
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  };
  async function exportData() {
    const metadata = {
      format: 'item-nesia-metadata',
      version: 1,
      exportedAt: new Date().toISOString(),
      note: 'Metadata only. Photo files are not included. This is not a full backup.',
      ...data,
      items: data.items.map(({ photoUri, locationPhotoUri, ...item }) => ({
        ...item,
        hasPhoto: !!photoUri,
        hasLocationPhoto: !!locationPhotoUri,
      })),
    };
    const json = JSON.stringify(metadata, null, 2);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(
        new Blob([json], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'item-nesia-metadata.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else await Share.share({ title: 'Item-Nesia metadata', message: json });
  }
  return (
    <Screen>
      <Header title="Settings" />
      <Section title="Appearance" />
      {(['system', 'light', 'dark'] as const).map((theme) => (
        <Button
          key={theme}
          title={theme[0].toUpperCase() + theme.slice(1)}
          secondary={data.settings.theme !== theme}
          onPress={() => update({ theme })}
        />
      ))}
      <Section title="Preferences" />
      <Panel>
        <View style={s.row}>
          <Copy>Haptic feedback</Copy>
          <Switch
            accessibilityLabel="Haptic feedback"
            value={data.settings.hapticsEnabled}
            trackColor={{ true: colors.primary }}
            onValueChange={(hapticsEnabled) => update({ hapticsEnabled })}
          />
        </View>
        <Button
          secondary
          title={`Default view: ${data.settings.defaultItemsView} · change`}
          onPress={() =>
            update({
              defaultItemsView:
                data.settings.defaultItemsView === 'grid' ? 'list' : 'grid',
            })
          }
        />
      </Panel>
      <Section title="Your data" />
      <Copy muted>
        {Platform.OS === 'web'
          ? 'This preview saves in this browser. Browser storage can be cleared and has limited photo capacity.'
          : 'Saved on this device. No account, cloud service, or location tracking.'}
      </Copy>
      <Button
        secondary
        title="Export item metadata"
        disabled={busy}
        onPress={() => action(exportData)}
      />
      <Copy muted style={{ fontSize: 12 }}>
        JSON metadata only. Photos are not included; this is not a full backup.
      </Copy>
      <Button
        secondary
        title="Restore missing demo items"
        disabled={busy}
        onPress={() => action(() => repository.seedDemo())}
      />
      <Copy muted style={{ fontSize: 12 }}>
        Adds missing samples without replacing your items or edited samples.
      </Copy>
      <Button
        danger
        title="Clear all saved data"
        disabled={busy}
        onPress={() => {
          void confirm(
            'Clear all saved data?',
            'All items, places, and location history will be removed from this device. This cannot be undone.',
          ).then((yes) => {
            if (yes) action(() => repository.clear());
          });
        }}
      />
      <ErrorMessage message={error} />
    </Screen>
  );
}
