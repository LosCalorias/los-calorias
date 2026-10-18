import { renderRouter, screen, waitFor, fireEvent } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import { ApiError, apiRequest } from '@/api/client';
import { saveToken } from '@/api/token';

jest.mock('@/api/client', () => ({
  ...jest.requireActual('@/api/client'),
  apiRequest: jest.fn(),
}));

const api = jest.mocked(apiRequest);

const profile = {
  sex: 'female',
  age: 30,
  height_cm: 165,
  weight_kg: 60,
  activity_level: 'moderate',
  goal: 'maintain',
  daily_norm: { kcal: 2046, protein: 128, fat: 68, carbs: 230 },
};

const summary = {
  norm: profile.daily_norm,
  consumed: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  remaining: profile.daily_norm,
};

function mockApi(overrides: Record<string, () => unknown> = {}) {
  const routes: Record<string, () => unknown> = {
    'POST /auth/login': () => ({ access_token: 'login-token', token_type: 'bearer' }),
    'POST /auth/register': () => ({ access_token: 'new-token', token_type: 'bearer' }),
    'GET /profile': () => profile,
    'GET /meals/summary': () => summary,
    'GET /meals': () => [],
    ...overrides,
  };
  api.mockImplementation(async (path, options = {}) => {
    const handler = routes[`${options.method ?? 'GET'} ${path}`];
    if (!handler) throw new Error(`Unexpected request ${path}`);
    return handler() as never;
  });
}

async function fillCredentials(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Пароль'), password);
}

beforeEach(async () => {
  api.mockReset();
  await saveToken(null);
});

it('opens login when there is no saved token', async () => {
  mockApi();
  const router = await renderRouter('./src/app');

  await waitFor(() => expect(router.getPathname()).toBe('/login'));
  expect(screen.getByText('Увійти')).toBeTruthy();
});

it('opens home when a token is saved', async () => {
  await SecureStore.setItemAsync('access_token', 'saved-token');
  mockApi();
  const router = await renderRouter('./src/app');

  await waitFor(() => expect(router.getPathname()).toBe('/'));
  expect(await screen.findByText('Залишилось на сьогодні')).toBeTruthy();
});

it('logs in and shows home', async () => {
  mockApi();
  const router = await renderRouter('./src/app');
  await screen.findByText('Увійти');

  await fillCredentials(' anna@example.com ', 'secret-password');
  await fireEvent.press(screen.getByText('Увійти'));

  await waitFor(() => expect(router.getPathname()).toBe('/'));
  expect(api).toHaveBeenCalledWith('/auth/login', {
    method: 'POST',
    body: { email: 'anna@example.com', password: 'secret-password' },
  });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'login-token');
});

it('shows backend error for wrong password', async () => {
  mockApi({
    'POST /auth/login': () => {
      throw new ApiError('Невірний email або пароль', 401);
    },
  });
  await renderRouter('./src/app');
  await screen.findByText('Увійти');

  await fillCredentials('anna@example.com', 'wrong-password');
  await fireEvent.press(screen.getByText('Увійти'));

  expect(await screen.findByText('Невірний email або пароль')).toBeTruthy();
});

it('registers and opens profile', async () => {
  mockApi({
    'GET /profile': () => {
      throw new ApiError('Профіль ще не заповнено', 404);
    },
  });
  const router = await renderRouter('./src/app', { initialUrl: '/register' });
  await screen.findByText('Зареєструватися');

  await fillCredentials('anna@example.com', 'secret-password');
  await fireEvent.press(screen.getByText('Зареєструватися'));

  await waitFor(() => expect(router.getPathname()).toBe('/profile'));
  expect(await screen.findByText('Заповніть профіль, щоб розрахувати денну норму.')).toBeTruthy();
});

it('shows taken email message on registration', async () => {
  mockApi({
    'POST /auth/register': () => {
      throw new ApiError('Цей email уже використовується', 409);
    },
  });
  await renderRouter('./src/app', { initialUrl: '/register' });
  await screen.findByText('Зареєструватися');

  await fillCredentials('anna@example.com', 'secret-password');
  await fireEvent.press(screen.getByText('Зареєструватися'));

  expect(await screen.findByText('Цей email уже використовується')).toBeTruthy();
});

it('rejects short password before calling backend', async () => {
  mockApi();
  await renderRouter('./src/app', { initialUrl: '/register' });
  await screen.findByText('Зареєструватися');

  await fillCredentials('anna@example.com', 'short');
  await fireEvent.press(screen.getByText('Зареєструватися'));

  expect(screen.getByText('Пароль має бути не коротшим за 8 символів')).toBeTruthy();
  expect(api).not.toHaveBeenCalledWith('/auth/register', expect.anything());
});

it('signs out from profile', async () => {
  await SecureStore.setItemAsync('access_token', 'saved-token');
  mockApi();
  const router = await renderRouter('./src/app', { initialUrl: '/profile' });
  await screen.findByText('2046 ккал');

  await fireEvent.press(screen.getByText('Вийти'));

  await waitFor(() => expect(router.getPathname()).toBe('/login'));
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
});
