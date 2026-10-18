import { router, useLocalSearchParams } from 'expo-router';
import { RecipeScreen } from '@/features/recipes/RecipeScreen';

export default function RecipeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RecipeScreen
      id={Number(id)}
      onDeleted={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
