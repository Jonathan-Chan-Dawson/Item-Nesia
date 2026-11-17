import { Header, Screen } from '../components/ui';
import { ItemBrowser } from './ItemBrowser';
export function ItemGallery({
  filter = 'all',
  placeId,
  text,
}: {
  filter?: 'all' | 'favorites' | 'archived';
  placeId?: string;
  text?: string;
}) {
  return (
    <Screen scroll={false}>
      <Header title="All Items" />
      <ItemBrowser
        initialView={filter}
        scopePlaceId={placeId}
        initialText={text}
      />
    </Screen>
  );
}
