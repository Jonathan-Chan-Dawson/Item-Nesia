import { Header, Screen } from '../components/ui';
import { ItemBrowser } from './ItemBrowser';
export function ItemGallery({
  filter = 'all',
  placeId,
  text,
}: {
  filter?: 'all' | 'favorites' | 'archived' | 'trash';
  placeId?: string;
  text?: string;
}) {
  return (
    <Screen scroll={false}>
      <Header
        title={
          filter === 'trash'
            ? 'Trash'
            : filter === 'archived'
              ? 'Archive'
              : filter === 'favorites'
                ? 'Starred'
                : 'All Items'
        }
      />
      <ItemBrowser
        initialView={filter}
        scopePlaceId={placeId}
        initialText={text}
      />
    </Screen>
  );
}
