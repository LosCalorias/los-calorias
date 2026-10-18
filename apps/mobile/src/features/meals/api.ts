import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/api/client';

export type Macros = { kcal: number; protein: number; fat: number; carbs: number };

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Meal = Macros & {
  id: number;
  date: string;
  meal_type: MealType;
  recipe_id: number | null;
  name: string;
  servings: number | null;
};

export type MealCreate = {
  date: string;
  meal_type: MealType;
  recipe_id?: number;
  servings?: number;
  name?: string;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
};

export type DaySummary = { norm: Macros; consumed: Macros; remaining: Macros };

export const MEAL_TYPES: readonly { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Сніданок' },
  { value: 'lunch', label: 'Обід' },
  { value: 'dinner', label: 'Вечеря' },
  { value: 'snack', label: 'Перекус' },
];

export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function mealTypeForHour(hour: number): MealType {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export function useDaySummary(date: string) {
  return useQuery({
    queryKey: ['meals', date, 'summary'],
    queryFn: () => apiRequest<DaySummary>('/meals/summary', { query: { date } }),
  });
}

export function useMeals(date: string) {
  return useQuery({
    queryKey: ['meals', date, 'list'],
    queryFn: () => apiRequest<Meal[]>('/meals', { query: { date } }),
  });
}

export function useAddMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meal: MealCreate) => apiRequest<Meal>('/meals', { method: 'POST', body: meal }),
    onSuccess: (meal) => queryClient.invalidateQueries({ queryKey: ['meals', meal.date] }),
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meal: Meal) => apiRequest<void>(`/meals/${meal.id}`, { method: 'DELETE' }),
    onSuccess: (_, meal) => queryClient.invalidateQueries({ queryKey: ['meals', meal.date] }),
  });
}
