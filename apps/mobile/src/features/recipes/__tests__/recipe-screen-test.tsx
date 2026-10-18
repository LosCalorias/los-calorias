import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { apiRequest } from '@/api/client';
import { todayIso } from '@/features/meals/api';
import { renderWithQuery } from '@/test/render';
import { RecipeScreen } from '../RecipeScreen';
import type { Recipe } from '../api';
import { formatAmount } from '../format';

jest.mock('@/api/client', () => ({
  ...jest.requireActual('@/api/client'),
  apiRequest: jest.fn(),
}));

const api = jest.mocked(apiRequest);

function makeRecipe(servings: number): Recipe {
  const factor = servings / 2;
  return {
    id: 3,
    title: 'Млинці',
    servings,
    ingredients: [
      {
        name: 'Борошно',
        quantity: 200 * factor,
        unit: 'g',
        grams: 200 * factor,
        kcal_per_100g: 364,
        protein_per_100g: 10,
        fat_per_100g: 1,
        carbs_per_100g: 76,
        missing_nutrition: false,
      },
      {
        name: 'Сіль',
        quantity: 1 * factor,
        unit: 'pinch',
        grams: null,
        kcal_per_100g: null,
        protein_per_100g: null,
        fat_per_100g: null,
        carbs_per_100g: null,
        missing_nutrition: true,
      },
    ],
    steps: ['Змішати', 'Посмажити'],
    source_url: 'https://www.tiktok.com/@chef/video/1',
    nutrition: {
      total: { kcal: 728 * factor, protein: 20 * factor, fat: 2 * factor, carbs: 152 * factor },
      per_serving: { kcal: 364, protein: 10, fat: 1, carbs: 76 },
    },
  };
}

function mockApi() {
  api.mockImplementation(async (path, options = {}) => {
    const method = options.method ?? 'GET';
    if (method === 'GET' && path === '/recipes/3') {
      return makeRecipe(Number(options.query?.servings ?? 2)) as never;
    }
    if (method === 'POST' && path === '/meals') {
      return { ...(options.body as object), id: 1, name: 'Млинці' } as never;
    }
    if (method === 'DELETE' && path === '/recipes/3') return undefined as never;
    throw new Error(`Unexpected request ${method} ${path}`);
  });
}

function calls(method: string, path: string) {
  return api.mock.calls.filter(([p, o]) => p === path && (o?.method ?? 'GET') === method);
}

beforeEach(() => {
  api.mockReset();
  mockApi();
});

it('shows nutrition, ingredients and steps', async () => {
  await renderWithQuery(<RecipeScreen id={3} onDeleted={jest.fn()} />);

  expect(await screen.findByText('Млинці')).toBeTruthy();
  expect(screen.getByText('Порцій: 2')).toBeTruthy();
  expect(screen.getByText('364 ккал · Б 10 · Ж 1 · В 76')).toBeTruthy();
  expect(screen.getByText('728 ккал · Б 20 · Ж 2 · В 152')).toBeTruthy();
  expect(screen.getByText('без даних')).toBeTruthy();
  expect(screen.getByText('2. Посмажити')).toBeTruthy();
});

it('scales the recipe when servings change', async () => {
  await renderWithQuery(<RecipeScreen id={3} onDeleted={jest.fn()} />);
  await screen.findByText('Порцій: 2');

  await fireEvent.press(screen.getByText('+'));
  await fireEvent.press(screen.getByText('+'));

  expect(await screen.findByText('Порцій: 4')).toBeTruthy();
  expect(screen.getByText('1456 ккал · Б 40 · Ж 4 · В 304')).toBeTruthy();
  expect(screen.getByText('364 ккал · Б 10 · Ж 1 · В 76')).toBeTruthy();
  expect(screen.getByText('400 g')).toBeTruthy();
  expect(calls('GET', '/recipes/3').at(-1)?.[1]).toEqual({ query: { servings: 4 } });
});

it('logs eaten portions as a meal', async () => {
  await renderWithQuery(<RecipeScreen id={3} onDeleted={jest.fn()} />);
  await screen.findByText('Млинці');

  await fireEvent.press(screen.getByText('Обід'));
  await fireEvent.changeText(screen.getByLabelText('Порцій з’їдено'), '1,5');
  await fireEvent.press(screen.getByText('Додати порцію'));

  expect(await screen.findByText('Додано: Обід')).toBeTruthy();
  expect(calls('POST', '/meals')[0][1]?.body).toEqual({
    date: todayIso(),
    meal_type: 'lunch',
    recipe_id: 3,
    servings: 1.5,
  });
});

it('rejects zero portions', async () => {
  await renderWithQuery(<RecipeScreen id={3} onDeleted={jest.fn()} />);
  await screen.findByText('Млинці');

  await fireEvent.changeText(screen.getByLabelText('Порцій з’їдено'), '0');
  await fireEvent.press(screen.getByText('Додати порцію'));

  expect(screen.getByText('Вкажіть кількість порцій більше нуля')).toBeTruthy();
  expect(calls('POST', '/meals')).toHaveLength(0);
});

it('deletes the recipe after confirmation', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });
  const onDeleted = jest.fn();
  await renderWithQuery(<RecipeScreen id={3} onDeleted={onDeleted} />);
  await screen.findByText('Млинці');

  await fireEvent.press(screen.getByText('Видалити рецепт'));

  await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  expect(calls('DELETE', '/recipes/3')).toHaveLength(1);
});

it.each([
  [{ quantity: 200, unit: 'g', grams: 200 }, '200 g'],
  [{ quantity: 2, unit: 'tbsp', grams: 30 }, '2 tbsp · 30 г'],
  [{ quantity: 3, unit: null, grams: null }, '3'],
  [{ quantity: null, unit: null, grams: null }, ''],
])('formats amount %j', (amount, expected) => {
  const ingredient = {
    name: 'x',
    kcal_per_100g: null,
    protein_per_100g: null,
    fat_per_100g: null,
    carbs_per_100g: null,
    ...amount,
  };
  expect(formatAmount(ingredient)).toBe(expected);
});
