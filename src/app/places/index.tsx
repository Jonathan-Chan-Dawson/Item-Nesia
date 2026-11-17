import { FlatList } from 'react-native';
import { router } from 'expo-router';
import { Button, Copy, Empty, Header, Screen } from '../../components/ui';
import { useMemory } from '../../hooks/useMemory';
import { placePath } from '../../utils/memory';
import { PlaceCard } from '../../components/PlaceCard';

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
        renderItem={({ item: place }) => <PlaceCard place={place} />}
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
