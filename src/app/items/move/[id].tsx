import { useLocalSearchParams } from 'expo-router';
import { MoveItem } from '../../../features/MoveItem';
export default function Move() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MoveItem key={id} id={id} />;
}
