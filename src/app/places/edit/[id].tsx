import { useLocalSearchParams } from 'expo-router';
import { PlaceForm } from '../../../features/PlaceForm';
export default function EditPlace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlaceForm id={id} />;
}
