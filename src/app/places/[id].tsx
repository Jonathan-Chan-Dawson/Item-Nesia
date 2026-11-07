import { useLocalSearchParams, router } from 'expo-router';
import {
  Button,
  Copy,
  Empty,
  Header,
  IconButton,
  Panel,
  Screen,
  Section,
} from '../../components/ui';
import { ItemCard } from '../../components/ItemCard';
import { useMemory } from '../../hooks/useMemory';
import { placePath } from '../../utils/memory';

export default function PlaceDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useMemory();
  const place = data.places.find((p) => p.id === id);
  if (!place)
    return (
      <Screen>
        <Header title="Place unavailable" />
        <Empty
          title="This place isn’t here."
          message="Choose another place from My Places."
        />
      </Screen>
    );
  const children = data.places.filter((p) => p.parentId === id);
  const items = data.items.filter((i) => i.placeId === id && !i.isArchived);
  return (
    <Screen>
      <Header
        title={place.name}
        right={
          <IconButton
            label="Edit place"
            icon="create-outline"
            onPress={() =>
              router.push({ pathname: '/places/edit/[id]', params: { id } })
            }
          />
        }
      />
      <Panel>
        <Copy title>{place.name}</Copy>
        <Copy muted>{placePath(place.id, data.places)}</Copy>
      </Panel>
      {children.length > 0 && (
        <>
          <Section title="Inside this place" />
          {children.map((child) => (
            <Button
              key={child.id}
              title={child.name}
              secondary
              icon="file-tray-outline"
              onPress={() =>
                router.push({
                  pathname: '/places/[id]',
                  params: { id: child.id },
                })
              }
            />
          ))}
        </>
      )}
      <Section title="Items stored here" />
      {items.length ? (
        items.map((item) => <ItemCard key={item.id} item={item} list />)
      ) : (
        <Empty
          title="A place for something good."
          message="Items assigned directly to this place will appear here. Open a child place to see what’s inside."
        />
      )}
    </Screen>
  );
}
