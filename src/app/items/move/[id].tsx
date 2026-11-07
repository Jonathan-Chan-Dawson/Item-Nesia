import { useLocalSearchParams } from 'expo-router';
import { ItemForm } from '../../../features/ItemForm';
export default function Move() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemForm id={id} move />;
}
