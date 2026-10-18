import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/api/client';
import type { Macros } from '@/features/meals/api';

export type IngredientDraft = {
  name: string;
  quantity: number | null;
  unit: string | null;
  grams: number | null;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  carbs_per_100g: number | null;
};

export type RecipeDraft = {
  title: string;
  servings: number;
  ingredients: IngredientDraft[];
  steps: string[];
  source_url: string;
};

export type Ingredient = IngredientDraft & { missing_nutrition: boolean };

export type Recipe = {
  id: number;
  title: string;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  source_url: string | null;
  nutrition: { total: Macros; per_serving: Macros };
};

export type RecipeSummary = {
  id: number;
  title: string;
  servings: number;
  kcal_per_serving: number;
};

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes', 'list'],
    queryFn: () => apiRequest<RecipeSummary[]>('/recipes'),
  });
}

export function useRecipe(id: number, servings?: number) {
  return useQuery({
    queryKey: ['recipes', id, servings ?? 'saved'],
    queryFn: () =>
      apiRequest<Recipe>(`/recipes/${id}`, servings ? { query: { servings } } : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/recipes/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  });
}
