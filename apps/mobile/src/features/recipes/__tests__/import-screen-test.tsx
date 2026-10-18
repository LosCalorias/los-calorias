import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, apiRequest } from '@/api/client';
import { renderWithQuery } from '@/test/render';
import { ImportScreen } from '../ImportScreen';
import type { RecipeDraft } from '../api';
import { toDraft, toForm } from '../draft-form';

jest.mock('@/api/client', () => ({
  ...jest.requireActual('@/api/client'),
  apiRequest: jest.fn(),
}));

const api = jest.mocked(apiRequest);

const TIKTOK_URL = 'https://www.tiktok.com/@chef/video/123';

const draft: RecipeDraft = {
  title: 'Млинці',
  servings: 4,
  ingredients: [
    {
      name: 'Борошно',
      quantity: 200,
      unit: 'g',
      grams: 200,
      kcal_per_100g: 364,
      protein_per_100g: 10.3,
      fat_per_100g: 1,
      carbs_per_100g: 76.3,
    },
    {
      name: 'Молоко',
      quantity: 0.5,
      unit: 'l',
      grams: 515,
      kcal_per_100g: null,
      protein_per_100g: null,
      fat_per_100g: null,
      carbs_per_100g: null,
    },
  ],
  steps: ['Змішати інгредієнти', 'Посмажити'],
  source_url: TIKTOK_URL,
};

function mockApi(importResult: () => RecipeDraft = () => draft) {
  api.mockImplementation(async (path, options = {}) => {
    if (path === '/recipes/import') return importResult() as never;
    if (path === '/recipes' && options.method === 'POST') return { id: 42 } as never;
    throw new Error(`Unexpected request ${path}`);
  });
}

function saved() {
  return api.mock.calls.find(([path]) => path === '/recipes')?.[1]?.body as RecipeDraft;
}

async function importDraft(onSaved = jest.fn()) {
  await renderWithQuery(<ImportScreen onSaved={onSaved} />);
  await fireEvent.changeText(screen.getByLabelText('Посилання'), ` ${TIKTOK_URL} `);
  await fireEvent.press(screen.getByText('Імпортувати'));
  await screen.findByText('Перевірте та виправте рецепт перед збереженням.');
  return onSaved;
}

beforeEach(() => api.mockReset());

it('imports a draft, lets user fix it and saves', async () => {
  mockApi();
  const onSaved = await importDraft();

  expect(api).toHaveBeenCalledWith('/recipes/import', { method: 'POST', body: { url: TIKTOK_URL } });
  expect(screen.getByLabelText('Назва').props.value).toBe('Млинці');
  expect(screen.getByLabelText('Інгредієнт 2: назва').props.value).toBe('Молоко');
  expect(screen.getByText('Без даних КБЖУ — заповніть вручну або залиште порожнім')).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('Назва'), 'Тонкі млинці');
  await fireEvent.changeText(screen.getByLabelText('Інгредієнт 2: Ккал / 100 г'), '52');
  await fireEvent.press(screen.getByText('Зберегти'));

  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(42));
  expect(saved()).toEqual({
    ...draft,
    title: 'Тонкі млинці',
    ingredients: [draft.ingredients[0], { ...draft.ingredients[1], kcal_per_100g: 52 }],
  });
});

it('removes an ingredient and a step before saving', async () => {
  mockApi();
  await importDraft();

  await fireEvent.press(screen.getByText('Видалити інгредієнт 1'));
  await fireEvent.press(screen.getByText('Видалити крок 2'));
  await fireEvent.press(screen.getByText('Зберегти'));

  await waitFor(() => expect(saved()).toBeDefined());
  expect(saved().ingredients.map((item) => item.name)).toEqual(['Молоко']);
  expect(saved().steps).toEqual(['Змішати інгредієнти']);
});

it('shows backend error for unsupported link', async () => {
  mockApi(() => {
    throw new ApiError('Підтримуються лише посилання на TikTok або Instagram', 422);
  });
  await renderWithQuery(<ImportScreen onSaved={jest.fn()} />);

  await fireEvent.changeText(screen.getByLabelText('Посилання'), 'https://youtube.com/watch?v=1');
  await fireEvent.press(screen.getByText('Імпортувати'));

  expect(
    await screen.findByText('Підтримуються лише посилання на TikTok або Instagram'),
  ).toBeTruthy();
});

it('requires a link', async () => {
  mockApi();
  await renderWithQuery(<ImportScreen onSaved={jest.fn()} />);

  await fireEvent.press(screen.getByText('Імпортувати'));

  expect(screen.getByText('Вставте посилання на відео')).toBeTruthy();
  expect(api).not.toHaveBeenCalled();
});

it('returns to the link step on cancel', async () => {
  mockApi();
  await importDraft();

  await fireEvent.press(screen.getByText('Скасувати'));

  expect(screen.getByText('Рецепт з відео')).toBeTruthy();
});

it('keeps the draft when saving fails', async () => {
  mockApi();
  await importDraft();
  api.mockRejectedValueOnce(new ApiError("Немає з'єднання з сервером", 0));

  await fireEvent.press(screen.getByText('Зберегти'));

  expect(await screen.findByText("Немає з'єднання з сервером")).toBeTruthy();
  expect(screen.getByLabelText('Назва').props.value).toBe('Млинці');
});

describe('toDraft', () => {
  it('round-trips an imported draft', () => {
    expect(toDraft(toForm(draft))).toEqual(draft);
  });

  it.each([
    [{ title: ' ' }, 'Вкажіть назву рецепта'],
    [{ servings: '0' }, 'Кількість порцій — ціле число від 1'],
    [{ servings: '1.5' }, 'Кількість порцій — ціле число від 1'],
    [{ ingredients: [] }, 'Додайте хоча б один інгредієнт'],
  ])('rejects %j', (patch, message) => {
    expect(toDraft({ ...toForm(draft), ...patch })).toBe(message);
  });

  it('rejects negative numbers and empty ingredient names', () => {
    const form = toForm(draft);
    form.ingredients[0].grams = '-5';
    expect(toDraft(form)).toBe('Інгредієнт 1 «Борошно»: числа мають бути не менші за 0');
    form.ingredients[0] = { ...form.ingredients[0], grams: '200', name: '' };
    expect(toDraft(form)).toBe('Вкажіть назву інгредієнта 1');
  });

  it('turns empty fields into null and comma decimals into numbers', () => {
    const form = toForm(draft);
    form.ingredients[0].grams = '';
    form.ingredients[0].fat_per_100g = '1,5';
    form.steps = ['  ', 'Посмажити '];
    const result = toDraft(form);
    if (typeof result === 'string') throw new Error(result);
    expect(result.ingredients[0].grams).toBeNull();
    expect(result.ingredients[0].fat_per_100g).toBe(1.5);
    expect(result.steps).toEqual(['Посмажити']);
  });
});
