import { router } from 'expo-router';
import { ImportScreen } from '@/features/recipes/ImportScreen';

export default function ImportRoute() {
  return <ImportScreen onSaved={(id) => router.push(`/recipes/${id}`)} />;
}
