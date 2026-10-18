import { router } from 'expo-router';
import { LibraryScreen } from '@/features/recipes/LibraryScreen';

export default function LibraryRoute() {
  return <LibraryScreen onOpen={(id) => router.push(`/recipes/${id}`)} />;
}
