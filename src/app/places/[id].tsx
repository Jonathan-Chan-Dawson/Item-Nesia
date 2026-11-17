import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Copy, Empty, ErrorMessage, Header, Screen } from '../../components/ui';
import { OverflowMenu } from '../../components/OverflowMenu';
import { PlaceCard } from '../../components/PlaceCard';
import { ItemBrowser } from '../../features/ItemBrowser';
import { useMemory } from '../../hooks/useMemory';
import { placePath } from '../../utils/memory';
export default function PlaceDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, repository } = useMemory();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const place = data.places.find((p) => p.id === id);
  const pinned = data.settings.quickAccess.some(
    (ref) => ref.kind === 'place' && ref.id === id,
  );
  if (!place)
    return (
      <Screen>
        <Header title="Place unavailable" />
        <Empty
          title="This place isn’t here."
          message="Choose another place from Places."
        />
      </Screen>
    );
  return (
    <Screen scroll={false}>
      <Header
        title={place.name}
        right={
          <OverflowMenu
            title="Place"
            options={[
              { value: 'add', label: 'Remember an item here', icon: 'add' },
              { value: 'edit', label: 'Edit place', icon: 'create-outline' },
              {
                value: 'pin',
                label: pinned ? 'Remove from Quick Access' : 'Pin to Home',
                icon: 'pin-outline',
              },
            ]}
            onSelect={(value) => {
              if (value === 'edit')
                router.push({ pathname: '/places/edit/[id]', params: { id } });
              if (value === 'add')
                router.push({ pathname: '/capture', params: { placeId: id } });
              if (value === 'pin')
                void repository
                  .toggleShortcut({ kind: 'place', id })
                  .then(() =>
                    setNotice(pinned ? 'Shortcut removed.' : 'Pinned to Home.'),
                  )
                  .catch((e) => setError(e.message));
            }}
          />
        }
      />
      <Copy muted style={{ fontSize: 12 }}>
        {placePath(id, data.places)}
      </Copy>
      <ErrorMessage message={error} />
      {notice && <Copy style={{ fontSize: 12 }}>{notice}</Copy>}
      <ItemBrowser
        key={id}
        forceList
        scopePlaceId={id}
        leading={data.places
          .filter((p) => p.parentId === id)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((child) => ({
            id: child.id,
            render: () => <PlaceCard place={child} />,
          }))}
        onAdd={() =>
          router.push({ pathname: '/capture', params: { placeId: id } })
        }
      />
    </Screen>
  );
}
