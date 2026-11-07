import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Copy,
  Empty,
  ErrorMessage,
  Header,
  Icon,
  Panel,
  Screen,
  Section,
  s,
} from '../components/ui';
import { ItemCard } from '../components/ItemCard';
import { useMemory, useTheme } from '../hooks/useMemory';

export default function Home() {
  const { data, repository } = useMemory();
  const { colors } = useTheme();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const items = data.items
    .filter((i) => !i.isArchived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
  return (
    <Screen>
      <Header title="Item-Nesia" home />
      <View style={{ gap: 8, marginTop: 8 }}>
        <Copy
          muted
          style={{ fontSize: 11, letterSpacing: 2, fontWeight: '700' }}
        >
          A LITTLE LESS “WHERE’S MY…”
        </Copy>
        <Copy title style={{ fontSize: 31, lineHeight: 38, letterSpacing: -1 }}>
          Looking for something?
        </Copy>
        <Copy muted>Your stuff didn’t disappear. Probably.</Copy>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search your items"
        onPress={() => router.push('/search')}
        style={[
          s.row,
          {
            backgroundColor: colors.surface,
            padding: 18,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: 'flex-start',
          },
        ]}
      >
        <Icon name="search-outline" />
        <Copy muted>Where did I put my…?</Copy>
      </Pressable>
      <Button
        title="Remember an Item"
        icon="camera-outline"
        onPress={() => router.push('/capture')}
      />
      {!data.settings.onboardingCompleted && (
        <Panel>
          <Copy title>Snap it. Stash it. Find it.</Copy>
          <Copy muted>
            Save a photo and a place. We’ll remember the last location you
            record, so future you doesn’t have to.
          </Copy>
          <Button
            secondary
            title="Got it, let’s remember"
            onPress={() => {
              void repository
                .settings({ onboardingCompleted: true })
                .catch((e) => setError(e.message));
            }}
          />
        </Panel>
      )}
      <ErrorMessage message={error} />
      <Section
        title="Recently remembered"
        action={items.length ? 'See all' : undefined}
        onPress={() => router.push('/items')}
      />
      {items.length ? (
        <View style={{ gap: 14 }}>
          {Array.from({ length: Math.ceil(items.length / 2) }, (_, row) => (
            <View key={row} style={{ flexDirection: 'row', gap: 14 }}>
              {items.slice(row * 2, row * 2 + 2).map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
              {items.slice(row * 2, row * 2 + 2).length === 1 && (
                <View style={{ flex: 1 }} />
              )}
            </View>
          ))}
        </View>
      ) : (
        <>
          <Empty
            title="Let’s remember your first thing."
            message="Take a photo, save where it lives, and find it later."
          />
          <Button
            secondary
            title="Explore demo · 15 sample items"
            busy={busy}
            onPress={() => {
              setBusy(true);
              void repository
                .seedDemo()
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          />
        </>
      )}
      <Section
        title="Your places"
        action="See all"
        onPress={() => router.push('/places')}
      />
      {data.places.length ? (
        data.places
          .filter((p) => !p.parentId)
          .slice(0, 3)
          .map((place) => (
            <Pressable
              key={place.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/places/[id]',
                  params: { id: place.id },
                })
              }
            >
              <Panel>
                <View style={s.row}>
                  <Icon name="file-tray-outline" />
                  <View style={{ flex: 1 }}>
                    <Copy style={{ fontWeight: '700' }}>{place.name}</Copy>
                    <Copy muted style={{ fontSize: 12 }}>
                      {
                        data.items.filter(
                          (i) => i.placeId === place.id && !i.isArchived,
                        ).length
                      }{' '}
                      items directly here
                    </Copy>
                  </View>
                  <Icon name="chevron-forward" size={18} />
                </View>
              </Panel>
            </Pressable>
          ))
      ) : (
        <Button
          secondary
          title="Add your first place"
          icon="add"
          onPress={() => router.push('/places/new')}
        />
      )}
      <View style={[s.row, { justifyContent: 'center', marginTop: 16 }]}>
        <Icon name="lock-closed-outline" size={13} />
        <Copy muted style={{ fontSize: 12 }}>
          Your memories stay on this device.
        </Copy>
      </View>
    </Screen>
  );
}
