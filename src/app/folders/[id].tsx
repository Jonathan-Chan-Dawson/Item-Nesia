import { useLocalSearchParams } from 'expo-router';
import { Folders } from '../../features/Folders';
export default function FolderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Folders key={id} id={id} />;
}
