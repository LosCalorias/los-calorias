import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { Button, ChoiceGroup, ErrorText, Field, colors, layout } from '@/components/form';
import {
  MEAL_TYPES,
  type MealType,
  mealTypeForHour,
  todayIso,
  useAddMeal,
} from '@/features/meals/api';
import { type Recipe, useDeleteRecipe, useRecipe } from './api';
import { formatAmount, formatMacros } from './format';

type RecipeScreenProps = { id: number; onDeleted: () => void };

export function RecipeScreen({ id, onDeleted }: RecipeScreenProps) {
  const [servings, setServings] = useState<number>();
  const recipe = useRecipe(id, servings);

  if (recipe.isPending) {
    return (
      <View style={layout.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (recipe.isError) {
    return (
      <View style={layout.center}>
        <ErrorText>{recipe.error.message}</ErrorText>
      </View>
    );
  }

  const data = recipe.data;
  return (
    <ScrollView contentContainerStyle={layout.screen}>
      <Text style={[layout.title, { fontSize: 24 }]}>{data.title}</Text>
      <ServingsStepper
        value={servings ?? data.servings}
        loading={recipe.isFetching}
        onChange={(value) => setServings(value)}
      />
      <View style={layout.card}>
        <Text style={layout.muted}>На порцію</Text>
        <Text style={layout.text}>{formatMacros(data.nutrition.per_serving)}</Text>
        <Text style={layout.muted}>Усього на {data.servings} порц.</Text>
        <Text style={layout.text}>{formatMacros(data.nutrition.total)}</Text>
      </View>
      <Ingredients recipe={data} />
      <Steps steps={data.steps} />
      <AddToMeals recipeId={data.id} />
      <DeleteRecipe id={data.id} title={data.title} onDeleted={onDeleted} />
    </ScrollView>
  );
}

function ServingsStepper({
  value,
  loading,
  onChange,
}: {
  value: number;
  loading: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <View style={layout.row}>
      <Text style={[layout.text, { flex: 1 }]}>Порцій: {value}</Text>
      {loading && <ActivityIndicator color={colors.primary} />}
      <Button title="−" variant="secondary" disabled={value <= 1} onPress={() => onChange(value - 1)} />
      <Button title="+" variant="secondary" onPress={() => onChange(value + 1)} />
    </View>
  );
}

function Ingredients({ recipe }: { recipe: Recipe }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={layout.title}>Інгредієнти</Text>
      {recipe.ingredients.map((ingredient, index) => (
        <View key={`${index}-${ingredient.name}`} style={layout.row}>
          <Text style={[layout.text, { flex: 1 }]}>{ingredient.name}</Text>
          <Text style={layout.muted}>{formatAmount(ingredient)}</Text>
          {ingredient.missing_nutrition && (
            <Text style={[layout.muted, { color: colors.danger }]}>без даних</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function Steps({ steps }: { steps: string[] }) {
  if (steps.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={layout.title}>Приготування</Text>
      {steps.map((step, index) => (
        <Text key={index} style={layout.text}>
          {index + 1}. {step}
        </Text>
      ))}
    </View>
  );
}

function AddToMeals({ recipeId }: { recipeId: number }) {
  const addMeal = useAddMeal();
  const [mealType, setMealType] = useState<MealType>(() => mealTypeForHour(new Date().getHours()));
  const [portions, setPortions] = useState('1');
  const [formError, setFormError] = useState('');

  function submit() {
    const value = Number(portions.replace(',', '.'));
    if (!portions.trim() || !Number.isFinite(value) || value <= 0) {
      setFormError('Вкажіть кількість порцій більше нуля');
      return;
    }
    setFormError('');
    addMeal.mutate({ date: todayIso(), meal_type: mealType, recipe_id: recipeId, servings: value });
  }

  const addedLabel = MEAL_TYPES.find((option) => option.value === addMeal.data?.meal_type)?.label;
  return (
    <View style={[layout.card, { gap: 12 }]}>
      <Text style={layout.title}>Записати, що з’їли</Text>
      <ChoiceGroup label="Прийом їжі" options={MEAL_TYPES} value={mealType} onChange={setMealType} />
      <Field label="Порцій з’їдено" value={portions} onChangeText={setPortions} keyboardType="numeric" />
      <ErrorText>{formError || addMeal.error?.message}</ErrorText>
      {addMeal.isSuccess && addedLabel && (
        <Text style={[layout.text, { color: colors.primary }]}>Додано: {addedLabel}</Text>
      )}
      <Button title="Додати порцію" onPress={submit} loading={addMeal.isPending} />
    </View>
  );
}

function DeleteRecipe({ id, title, onDeleted }: { id: number; title: string; onDeleted: () => void }) {
  const deleteRecipe = useDeleteRecipe();

  function confirm() {
    Alert.alert('Видалити рецепт?', title, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: () => deleteRecipe.mutate(id, { onSuccess: onDeleted }),
      },
    ]);
  }

  return (
    <View style={{ gap: 8 }}>
      <ErrorText>{deleteRecipe.error?.message}</ErrorText>
      <Button title="Видалити рецепт" variant="danger" onPress={confirm} loading={deleteRecipe.isPending} />
    </View>
  );
}
