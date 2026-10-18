import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ApiError, apiRequest } from '@/api/client';
import { renderWithQuery } from '@/test/render';
import { HomeScreen } from '../HomeScreen';
import { mealTypeForHour, todayIso, type DaySummary, type Meal } from '../api';

jest.mock('@/api/client', () => ({
  ...jest.requireActual('@/api/client'),
  apiRequest: jest.fn(),
}));

const api = jest.mocked(apiRequest);
const today = todayIso();

const summary: DaySummary = {
  norm: { kcal: 2046, protein: 128, fat: 68, carbs: 230 },
  consumed: { kcal: 500, protein: 30, fat: 20, carbs: 50 },
  remaining: { kcal: 1546, protein: 98, fat: 48, carbs: 180 },
};

const meal: Meal = {
  id: 7,
  date: today,
  meal_type: 'lunch',
  recipe_id: null,
  name: 'Салат',
  servings: null,
  kcal: 500,
  protein: 30,
  fat: 20,
  carbs: 50,
};

function mockApi(overrides: Record<string, () => unknown> = {}) {
  const routes: Record<string, () => unknown> = {
    'GET /meals/summary': () => summary,
    'GET /meals': () => [meal],
    'POST /meals': () => meal,
    'DELETE /meals/7': () => undefined,
    ...overrides,
  };
  api.mockImplementation(async (path, options = {}) => {
    const handler = routes[`${options.method ?? 'GET'} ${path}`];
    if (!handler) throw new Error(`Unexpected request ${path}`);
    return handler() as never;
  });
}

function requests(method: string, path: string) {
  return api.mock.calls.filter(([p, o]) => p === path && (o?.method ?? 'GET') === method);
}

beforeEach(() => api.mockReset());

it('shows remaining norm and todays meals', async () => {
  mockApi();
  await renderWithQuery(<HomeScreen />);

  expect(await screen.findByText('1546 ккал')).toBeTruthy();
  expect(screen.getByText('Б 98 г · Ж 48 г · В 180 г')).toBeTruthy();
  expect(screen.getByText("Норма 2046 ккал · з’їдено 500 ккал")).toBeTruthy();
  expect(screen.getByText('Салат')).toBeTruthy();
  expect(requests('GET', '/meals/summary')[0][1]).toEqual({ query: { date: today } });
});

it('asks to fill the profile when there is none', async () => {
  mockApi({
    'GET /meals/summary': () => {
      throw new ApiError('Профіль ще не заповнено', 404);
    },
  });
  await renderWithQuery(<HomeScreen />);

  expect(
    await screen.findByText('Заповніть профіль у вкладці «Профіль», щоб побачити денну норму.'),
  ).toBeTruthy();
});

it('adds a manual meal and reloads the day', async () => {
  mockApi({ 'GET /meals': () => [] });
  await renderWithQuery(<HomeScreen />);
  await screen.findByText('Ще нічого не записано');

  await fireEvent.press(screen.getByText('Перекус'));
  await fireEvent.changeText(screen.getByLabelText('Назва'), ' Яблуко ');
  await fireEvent.changeText(screen.getByLabelText('Калорії, ккал'), '52,5');
  await fireEvent.changeText(screen.getByLabelText('Вуглеводи, г'), '14');
  await fireEvent.press(screen.getByText('Додати'));

  await waitFor(() => expect(requests('POST', '/meals')).toHaveLength(1));
  expect(requests('POST', '/meals')[0][1]?.body).toEqual({
    date: today,
    meal_type: 'snack',
    name: 'Яблуко',
    kcal: 52.5,
    protein: undefined,
    fat: undefined,
    carbs: 14,
  });
  await waitFor(() => expect(requests('GET', '/meals/summary')).toHaveLength(2));
});

it('requires name and calories', async () => {
  mockApi();
  await renderWithQuery(<HomeScreen />);
  await screen.findByText('Салат');

  await fireEvent.press(screen.getByText('Додати'));

  expect(screen.getByText('Вкажіть назву і калорії')).toBeTruthy();
  expect(requests('POST', '/meals')).toHaveLength(0);
});

it('deletes a meal after confirmation', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });
  mockApi();
  await renderWithQuery(<HomeScreen />);
  await screen.findByText('Салат');

  await fireEvent.press(screen.getByText('Видалити'));

  await waitFor(() => expect(requests('DELETE', '/meals/7')).toHaveLength(1));
});

it.each([
  [8, 'breakfast'],
  [13, 'lunch'],
  [19, 'dinner'],
  [23, 'snack'],
] as const)('picks meal type for %i:00', (hour, type) => {
  expect(mealTypeForHour(hour)).toBe(type);
});

it('formats local date as YYYY-MM-DD', () => {
  expect(todayIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
});
