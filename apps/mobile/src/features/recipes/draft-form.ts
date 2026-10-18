import type { IngredientDraft, RecipeDraft } from './api';

export const NUTRIENT_FIELDS = [
  ['kcal_per_100g', 'Ккал / 100 г'],
  ['protein_per_100g', 'Білки / 100 г'],
  ['fat_per_100g', 'Жири / 100 г'],
  ['carbs_per_100g', 'Вугл. / 100 г'],
] as const;

type NumericKey = 'quantity' | 'grams' | (typeof NUTRIENT_FIELDS)[number][0];

export type IngredientForm = { name: string; unit: string } & Record<NumericKey, string>;

export type DraftForm = {
  title: string;
  servings: string;
  ingredients: IngredientForm[];
  steps: string[];
  sourceUrl: string;
};

const NUMERIC_KEYS: NumericKey[] = ['quantity', 'grams', ...NUTRIENT_FIELDS.map(([key]) => key)];

export function emptyIngredient(): IngredientForm {
  return {
    name: '',
    unit: '',
    quantity: '',
    grams: '',
    kcal_per_100g: '',
    protein_per_100g: '',
    fat_per_100g: '',
    carbs_per_100g: '',
  };
}

export function toForm(draft: RecipeDraft): DraftForm {
  return {
    title: draft.title,
    servings: String(draft.servings),
    ingredients: draft.ingredients.map((ingredient) => {
      const form = { ...emptyIngredient(), name: ingredient.name, unit: ingredient.unit ?? '' };
      for (const key of NUMERIC_KEYS) {
        form[key] = ingredient[key] === null ? '' : String(ingredient[key]);
      }
      return form;
    }),
    steps: draft.steps,
    sourceUrl: draft.source_url,
  };
}

export function hasMissingNutrition(ingredient: IngredientForm): boolean {
  return [ingredient.grams, ...NUTRIENT_FIELDS.map(([key]) => ingredient[key])].some(
    (value) => !value.trim(),
  );
}

export function toDraft(form: DraftForm): RecipeDraft | string {
  const title = form.title.trim();
  if (!title) {
    return 'Вкажіть назву рецепта';
  }
  const servings = Number(form.servings);
  if (!Number.isInteger(servings) || servings < 1) {
    return 'Кількість порцій — ціле число від 1';
  }
  if (form.ingredients.length === 0) {
    return 'Додайте хоча б один інгредієнт';
  }

  const ingredients: IngredientDraft[] = [];
  for (const [index, ingredient] of form.ingredients.entries()) {
    const name = ingredient.name.trim();
    if (!name) {
      return `Вкажіть назву інгредієнта ${index + 1}`;
    }
    const draft: IngredientDraft = {
      name,
      unit: ingredient.unit.trim() || null,
      quantity: null,
      grams: null,
      kcal_per_100g: null,
      protein_per_100g: null,
      fat_per_100g: null,
      carbs_per_100g: null,
    };
    for (const key of NUMERIC_KEYS) {
      const value = parseOptionalNumber(ingredient[key]);
      if (value === undefined) {
        return `Інгредієнт ${index + 1} «${name}»: числа мають бути не менші за 0`;
      }
      draft[key] = value;
    }
    ingredients.push(draft);
  }

  return {
    title,
    servings,
    ingredients,
    steps: form.steps.map((step) => step.trim()).filter(Boolean),
    source_url: form.sourceUrl,
  };
}

function parseOptionalNumber(value: string): number | null | undefined {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
