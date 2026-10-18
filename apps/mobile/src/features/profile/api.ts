import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '@/api/client';

export type Sex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

export type ProfileUpdate = {
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
};

export type DailyNorm = { kcal: number; protein: number; fat: number; carbs: number };

export type Profile = ProfileUpdate & { daily_norm: DailyNorm };

export const SEX_OPTIONS: readonly { value: Sex; label: string }[] = [
  { value: 'female', label: 'Жінка' },
  { value: 'male', label: 'Чоловік' },
];

export const ACTIVITY_OPTIONS: readonly { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Сидячий спосіб життя' },
  { value: 'light', label: 'Легка (1–3 тренування)' },
  { value: 'moderate', label: 'Помірна (3–5)' },
  { value: 'active', label: 'Висока (6–7)' },
  { value: 'very_active', label: 'Дуже висока' },
];

export const GOAL_OPTIONS: readonly { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Схуднення' },
  { value: 'maintain', label: 'Підтримка' },
  { value: 'gain', label: 'Набір маси' },
];

const PROFILE_KEY = ['profile'];

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async () => {
      try {
        return await apiRequest<Profile>('/profile');
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: ProfileUpdate) =>
      apiRequest<Profile>('/profile', { method: 'PUT', body: profile }),
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_KEY, profile);
      return queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}
