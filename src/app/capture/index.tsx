import { ItemForm } from '../../features/ItemForm';
import { useLocalSearchParams } from 'expo-router';
export default function Capture() {
  const { folderId, placeId } = useLocalSearchParams<{
    folderId?: string;
    placeId?: string;
  }>();
  return (
    <ItemForm folderId={folderId || undefined} placeId={placeId || undefined} />
  );
}
