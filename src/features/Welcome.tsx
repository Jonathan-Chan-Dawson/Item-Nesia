import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Copy,
  ErrorMessage,
  Header,
  Icon,
  Panel,
  Screen,
} from '../components/ui';
import { useMemory, useTheme } from '../hooks/useMemory';

export function Welcome() {
  const { repository, startDemo, exitDemo, isDemo, data } = useMemory();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function enter(demo: boolean) {
    setBusy(true);
    setError(undefined);
    try {
      if (isDemo) {
        await exitDemo();
        router.replace('/welcome');
        return;
      }
      if (demo) await startDemo();
      else await repository.settings({ onboardingCompleted: true });
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Header title="Item-Nesia" home />
      <View style={{ paddingVertical: 24, gap: 18 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: colors.soft,
            padding: 18,
            borderRadius: 24,
          }}
        >
          <Icon name="cube-outline" size={40} />
        </View>
        <Copy title style={{ fontSize: 34, lineHeight: 41 }}>
          A little less searching.{'\n'}A little more remembering.
        </Copy>
        <Copy muted>
          Save what you put away, where it lives, and a photo if you like. Find
          it when you need it.
        </Copy>
      </View>
      <Button
        title={
          isDemo
            ? 'Exit demo'
            : data.items.length
              ? 'Back to my items'
              : 'Start with my items'
        }
        icon="arrow-forward"
        disabled={busy}
        onPress={() => void enter(false)}
      />
      <Button
        title="Try the demo"
        secondary
        icon="sparkles-outline"
        disabled={busy}
        onPress={() => void enter(true)}
      />
      <Copy muted style={{ textAlign: 'center', fontSize: 12 }}>
        60 sample belongings. Changes are temporary. Leave anytime.
      </Copy>
      <ErrorMessage message={error} />
      <Panel>
        {(
          [
            [
              'camera-outline',
              'Remember',
              'A name, a place, an optional photo.',
            ],
            ['search-outline', 'Find', 'Search for the thing you need.'],
            [
              'lock-closed-outline',
              'Keep it yours',
              'No account. Your items stay on this device.',
            ],
          ] as const
        ).map(([icon, title, description]) => (
          <View
            key={title}
            style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}
          >
            <Icon name={icon} />
            <View style={{ flex: 1 }}>
              <Copy style={{ fontWeight: '600' }}>{title}</Copy>
              <Copy muted style={{ fontSize: 13 }}>
                {description}
              </Copy>
            </View>
          </View>
        ))}
      </Panel>
      <Copy muted style={{ textAlign: 'center', fontSize: 12 }}>
        The demo is separate from your saved belongings.
      </Copy>
    </Screen>
  );
}
