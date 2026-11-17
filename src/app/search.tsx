import { Header, Screen } from '../components/ui';
import { ItemBrowser } from '../features/ItemBrowser';
export default function Search() {
  return (
    <Screen scroll={false}>
      <Header title="Find an item" />
      <ItemBrowser autoFocus forceList />
    </Screen>
  );
}
