import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MemoryProvider, useMemory, useTheme } from '../hooks/useMemory';
import { Button, Copy, Screen } from '../components/ui';

function Root() {
  const { loading, error, retry } = useMemory();
  const { colors, dark } = useTheme();
  if (loading || error)
    return (
      <Screen>
        <View style={{ paddingTop: 100, gap: 20 }}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Copy title>Your memories couldn’t be opened.</Copy>
              <Copy muted>{error}</Copy>
              <Button title="Try again" onPress={retry} />
            </>
          )}
        </View>
      </Screen>
    );
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
export default function Layout() {
  return (
    <MemoryProvider>
      <Root />
    </MemoryProvider>
  );
}
