import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { ErrorText, colors, layout } from '@/components/form';
import { useRecipes } from './api';

export function LibraryScreen({ onOpen }: { onOpen: (id: number) => void }) {
  const recipes = useRecipes();

  if (recipes.isPending) {
    return (
      <View style={layout.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (recipes.isError) {
    return (
      <View style={layout.center}>
        <ErrorText>{recipes.error.message}</ErrorText>
      </View>
    );
  }

  return (
    <FlatList
      data={recipes.data}
      keyExtractor={(recipe) => String(recipe.id)}
      contentContainerStyle={[layout.screen, { gap: 8 }]}
      refreshControl={
        <RefreshControl refreshing={recipes.isRefetching} onRefresh={() => void recipes.refetch()} />
      }
      ListEmptyComponent={
        <Text style={[layout.muted, { textAlign: 'center' }]}>
          Ще немає рецептів. Імпортуйте перший у вкладці «Імпорт».
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen(item.id)}
          style={layout.card}>
          <Text style={layout.text}>{item.title}</Text>
          <Text style={layout.muted}>
            {Math.round(item.kcal_per_serving)} ккал на порцію · {item.servings} порц.
          </Text>
        </Pressable>
      )}
    />
  );
}
