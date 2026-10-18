import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { ApiError } from '@/api/client';
import { Button, ChoiceGroup, ErrorText, Field, colors, layout } from '@/components/form';
import {
  MEAL_TYPES,
  type Macros,
  type Meal,
  type MealType,
  mealTypeForHour,
  todayIso,
  useAddMeal,
  useDaySummary,
  useDeleteMeal,
  useMeals,
} from './api';

export function HomeScreen() {
  const date = todayIso();
  return (
    <ScrollView contentContainerStyle={layout.screen}>
      <SummaryCard date={date} />
      <MealList date={date} />
      <ManualMealForm date={date} />
    </ScrollView>
  );
}

function SummaryCard({ date }: { date: string }) {
  const summary = useDaySummary(date);

  if (summary.isPending) {
    return <ActivityIndicator color={colors.primary} />;
  }
  if (summary.isError) {
    const noProfile = summary.error instanceof ApiError && summary.error.status === 404;
    return (
      <View style={layout.card}>
        {noProfile ? (
          <Text style={layout.text}>
            Заповніть профіль у вкладці «Профіль», щоб побачити денну норму.
          </Text>
        ) : (
          <ErrorText>{summary.error.message}</ErrorText>
        )}
      </View>
    );
  }

  const { norm, consumed, remaining } = summary.data;
  return (
    <View style={layout.card}>
      <Text style={layout.muted}>Залишилось на сьогодні</Text>
      <Text style={[layout.title, { fontSize: 32 }]}>{Math.round(remaining.kcal)} ккал</Text>
      <Text style={layout.text}>{formatMacros(remaining)}</Text>
      <Text style={layout.muted}>
        Норма {Math.round(norm.kcal)} ккал · з’їдено {Math.round(consumed.kcal)} ккал
      </Text>
    </View>
  );
}

function MealList({ date }: { date: string }) {
  const meals = useMeals(date);
  const deleteMeal = useDeleteMeal();

  function confirmDelete(meal: Meal) {
    Alert.alert('Видалити запис?', meal.name, [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Видалити', style: 'destructive', onPress: () => deleteMeal.mutate(meal) },
    ]);
  }

  if (meals.isPending) {
    return null;
  }
  if (meals.isError) {
    return <ErrorText>{meals.error.message}</ErrorText>;
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={layout.title}>Сьогодні</Text>
      {meals.data.length === 0 && <Text style={layout.muted}>Ще нічого не записано</Text>}
      {meals.data.map((meal) => (
        <View key={meal.id} style={[layout.card, layout.row]}>
          <View style={{ flex: 1 }}>
            <Text style={layout.text}>{meal.name}</Text>
            <Text style={layout.muted}>
              {mealTypeLabel(meal.meal_type)} · {Math.round(meal.kcal)} ккал
            </Text>
          </View>
          <Button title="Видалити" variant="secondary" onPress={() => confirmDelete(meal)} />
        </View>
      ))}
      <ErrorText>{deleteMeal.error?.message}</ErrorText>
    </View>
  );
}

function ManualMealForm({ date }: { date: string }) {
  const addMeal = useAddMeal();
  const [mealType, setMealType] = useState<MealType>(() => mealTypeForHour(new Date().getHours()));
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [formError, setFormError] = useState('');

  function submit() {
    const kcalValue = parseNumber(kcal);
    if (!name.trim() || kcalValue === undefined) {
      setFormError('Вкажіть назву і калорії');
      return;
    }
    setFormError('');
    addMeal.mutate(
      {
        date,
        meal_type: mealType,
        name: name.trim(),
        kcal: kcalValue,
        protein: parseNumber(protein),
        fat: parseNumber(fat),
        carbs: parseNumber(carbs),
      },
      {
        onSuccess: () => {
          for (const reset of [setName, setKcal, setProtein, setFat, setCarbs]) {
            reset('');
          }
        },
      },
    );
  }

  return (
    <View style={[layout.card, { gap: 12 }]}>
      <Text style={layout.title}>Додати вручну</Text>
      <ChoiceGroup label="Прийом їжі" options={MEAL_TYPES} value={mealType} onChange={setMealType} />
      <Field label="Назва" value={name} onChangeText={setName} />
      <Field label="Калорії, ккал" value={kcal} onChangeText={setKcal} keyboardType="numeric" />
      <View style={layout.row}>
        <View style={{ flex: 1 }}>
          <Field label="Білки, г" value={protein} onChangeText={setProtein} keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Жири, г" value={fat} onChangeText={setFat} keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Вуглеводи, г" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
        </View>
      </View>
      <ErrorText>{formError || addMeal.error?.message}</ErrorText>
      <Button title="Додати" onPress={submit} loading={addMeal.isPending} />
    </View>
  );
}

function parseNumber(value: string): number | undefined {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function mealTypeLabel(type: MealType): string {
  return MEAL_TYPES.find((option) => option.value === type)?.label ?? type;
}

function formatMacros({ protein, fat, carbs }: Macros): string {
  return `Б ${Math.round(protein)} г · Ж ${Math.round(fat)} г · В ${Math.round(carbs)} г`;
}
