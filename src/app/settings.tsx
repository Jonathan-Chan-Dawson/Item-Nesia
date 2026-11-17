import { useState } from 'react';
import { Platform, Share, Switch, View } from 'react-native';
import {
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
import { SegmentedChoice, SelectionRow } from '../components/controls';
import { OrganizeSamples } from '../components/OrganizeSamples';
import { BackupControls } from '../features/BackupControls';
import { router } from 'expo-router';

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
      <SegmentedChoice
        value={data.settings.theme}
        options={[
          { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
          { value: 'light', label: 'Light', icon: 'sunny-outline' },
          { value: 'dark', label: 'Dark', icon: 'moon-outline' },
        ]}
        onChange={(theme) => update({ theme: theme as Settings['theme'] })}
      />
      <Section title="Preferences" />
      <Panel>
        <SelectionRow
          title="Quick Access"
          subtitle="Choose and reorder up to four Home shortcuts."
          icon="pin-outline"
          onPress={() => router.push('/quick-access')}
        />
      </Panel>
      <Panel>
        <View style={s.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Copy style={{ fontWeight: '600' }}>Haptic feedback</Copy>
            <Copy muted style={{ fontSize: 12 }}>
              A little tap when a memory is saved.
            </Copy>
          </View>
          <Switch
            accessibilityLabel="Haptic feedback"
            value={data.settings.hapticsEnabled}
            trackColor={{ true: colors.primary }}
            onValueChange={(hapticsEnabled) => update({ hapticsEnabled })}
          />
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Copy style={{ fontWeight: '600' }}>Default items view</Copy>
        <SegmentedChoice
          value={data.settings.defaultItemsView}
          options={[
            { value: 'grid', label: 'Grid', icon: 'grid-outline' },
            { value: 'list', label: 'List', icon: 'list-outline' },
          ]}
          onChange={(defaultItemsView) =>
            update({
              defaultItemsView:
                defaultItemsView as Settings['defaultItemsView'],
            })
          }
        />
      </Panel>
      <Panel>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Copy>Reduce animations</Copy>
            <Copy muted style={{ fontSize: 12 }}>
              System reduced motion is always respected.
            </Copy>
          </View>
          <Switch
            accessibilityLabel="Reduce animations"
            value={!!data.settings.reduceAnimations}
            onValueChange={(reduceAnimations) => update({ reduceAnimations })}
          />
        </View>
      </Panel>
      <Section title="Your data" />
      <OrganizeSamples />
      <BackupControls />
      <Copy muted style={{ fontSize: 13, lineHeight: 20 }}>
        {Platform.OS === 'web'
          ? 'This preview saves in this browser. Browser storage can be cleared and has limited photo capacity.'
          : 'Saved on this device. No account, cloud service, or location tracking.'}
      </Copy>
      <Panel>
        <SelectionRow
          title="Export item metadata"
          subtitle="Share JSON details. Photos are not included."
          icon="download-outline"
          disabled={busy}
          onPress={() => action(exportData)}
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SelectionRow
          title="Restore missing demo items"
          subtitle="Add sample memories without replacing your items."
          icon="sparkles-outline"
          disabled={busy}
          onPress={() => action(() => repository.seedDemo())}
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SelectionRow
          danger
          title="Clear all saved data"
          subtitle="Permanently remove items, places, folders, shortcuts, and history."
          icon="trash-outline"
          disabled={busy}
          onPress={() => {
            void confirm(
              'Clear all saved data?',
              'All items, places, folders, Quick Access shortcuts, and location history will be removed from this device. This cannot be undone.',
            ).then((yes) => {
              if (yes) action(() => repository.clear());
            });
          }}
        />
      </Panel>
      <ErrorMessage message={error} />
      <Section title="About" />
      <Panel>
        <SelectionRow
          title="How to organize your items"
          subtitle="Places, folders, and categories explained."
          icon="help-circle-outline"
          onPress={() => router.push('/about')}
        />
      </Panel>
    </Screen>
  );
}
