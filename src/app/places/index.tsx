import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Copy,
  Empty,
  Header,
  Icon,
  Panel,
  Screen,
  s,
} from '../../components/ui';
import { useMemory } from '../../hooks/useMemory';
import { placePath } from '../../utils/memory';

export default function Places() {
  const { data } = useMemory();
  return (
    <Screen scroll={false}>
      <Header title="My Places" />
      <Copy muted>A home for everything. Even the little things.</Copy>
      <Button
        title="Add Place"
        icon="add"
        onPress={() => router.push('/places/new')}
      />
      <FlatList
        data={[...data.places].sort((a, b) =>
          placePath(a.id, data.places).localeCompare(
            placePath(b.id, data.places),
          ),
        )}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item: place }) => (
          <Pressable
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
                    {placePath(place.id, data.places)}
                  </Copy>
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
        )}
        ListEmptyComponent={
          <Empty
            title="Everything starts somewhere."
            message="Add a room, bag, shelf, or drawer. You can nest places inside each other."
          />
        }
      />
    </Screen>
  );
}
