import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemory, useTheme } from '../hooks/useMemory';

export function DemoNotice() {
  const { isDemo, exitDemo } = useMemory();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!isDemo) return null;
  return (
    <View style={{ backgroundColor: colors.soft, paddingHorizontal: 20 }}>
      <View
        style={{
          width: '100%',
          maxWidth: 600,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>
          {error ? 'Couldn’t exit. Try again.' : 'Demo · Try things freely'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit demo"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void exitDemo()
              .then(() => router.replace('/welcome'))
              .catch(() => {
                setError(true);
                setBusy(false);
              });
          }}
          style={{
            minHeight: 48,
            justifyContent: 'center',
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}
          >
            {busy ? 'Leaving…' : 'Exit demo'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
