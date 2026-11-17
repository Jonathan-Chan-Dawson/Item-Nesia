import { ItemGallery } from '../../features/ItemGallery';
import { useLocalSearchParams } from 'expo-router';
export default function Items() {
  const { query } = useLocalSearchParams<{ query?: string }>();
  return <ItemGallery key={query ?? ''} text={query} />;
}
