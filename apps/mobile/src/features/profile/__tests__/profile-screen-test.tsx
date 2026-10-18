import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, apiRequest } from '@/api/client';
import { renderWithQuery } from '@/test/render';
import { ProfileScreen } from '../ProfileScreen';
import type { Profile } from '../api';

jest.mock('@/api/client', () => ({
  ...jest.requireActual('@/api/client'),
  apiRequest: jest.fn(),
}));

const api = jest.mocked(apiRequest);

const profile: Profile = {
  sex: 'female',
  age: 30,
  height_cm: 165,
  weight_kg: 60,
  activity_level: 'moderate',
  goal: 'maintain',
  daily_norm: { kcal: 2046, protein: 128, fat: 68, carbs: 230 },
};

function puts() {
  return api.mock.calls.filter(([, options]) => options?.method === 'PUT');
}

beforeEach(() => api.mockReset());

it('shows saved profile and its daily norm', async () => {
  api.mockResolvedValue(profile);
  await renderWithQuery(<ProfileScreen />);

  expect(await screen.findByText('2046 ккал')).toBeTruthy();
  expect(screen.getByText('Б 128 г · Ж 68 г · В 230 г')).toBeTruthy();
  expect(screen.getByLabelText('Вага, кг').props.value).toBe('60');
  expect(screen.getByRole('radio', { name: 'Жінка' }).props.accessibilityState.selected).toBe(true);
});

it('saves a new profile and shows the calculated norm', async () => {
  api.mockImplementation(async (_path, options) => {
    if (options?.method === 'PUT') return profile as never;
    throw new ApiError('Профіль ще не заповнено', 404);
  });
  await renderWithQuery(<ProfileScreen />);
  await screen.findByText('Заповніть профіль, щоб розрахувати денну норму.');

  await fireEvent.press(screen.getByText('Жінка'));
  await fireEvent.changeText(screen.getByLabelText('Вік, років'), '30');
  await fireEvent.changeText(screen.getByLabelText('Зріст, см'), '165');
  await fireEvent.changeText(screen.getByLabelText('Вага, кг'), '60,5');
  await fireEvent.press(screen.getByText('Помірна (3–5)'));
  await fireEvent.press(screen.getByText('Підтримка'));
  await fireEvent.press(screen.getByText('Зберегти'));

  await waitFor(() => expect(puts()).toHaveLength(1));
  expect(puts()[0][1]?.body).toEqual({
    sex: 'female',
    age: 30,
    height_cm: 165,
    weight_kg: 60.5,
    activity_level: 'moderate',
    goal: 'maintain',
  });
  expect(await screen.findByText('2046 ккал')).toBeTruthy();
});

it('recalculates norm after changing weight', async () => {
  const heavier = { ...profile, weight_kg: 70, daily_norm: { ...profile.daily_norm, kcal: 2201 } };
  api.mockImplementation(async (_path, options) =>
    (options?.method === 'PUT' ? heavier : profile) as never,
  );
  await renderWithQuery(<ProfileScreen />);
  await screen.findByText('2046 ккал');

  await fireEvent.changeText(screen.getByLabelText('Вага, кг'), '70');
  await fireEvent.press(screen.getByText('Зберегти'));

  expect(await screen.findByText('2201 ккал')).toBeTruthy();
});

it.each([
  ['Вік, років', '5', 'Вік — ціле число від 14 до 100'],
  ['Зріст, см', '40', 'Зріст — від 100 до 250 см'],
  ['Вага, кг', 'abc', 'Вага — від 30 до 300 кг'],
])('rejects invalid %s', async (label, value, message) => {
  api.mockResolvedValue(profile);
  await renderWithQuery(<ProfileScreen />);
  await screen.findByText('2046 ккал');

  await fireEvent.changeText(screen.getByLabelText(label), value);
  await fireEvent.press(screen.getByText('Зберегти'));

  expect(screen.getByText(message)).toBeTruthy();
  expect(puts()).toHaveLength(0);
});

it('requires choosing sex, activity and goal', async () => {
  api.mockRejectedValue(new ApiError('Профіль ще не заповнено', 404));
  await renderWithQuery(<ProfileScreen />);
  await screen.findByText('Заповніть профіль, щоб розрахувати денну норму.');

  await fireEvent.press(screen.getByText('Зберегти'));

  expect(screen.getByText('Оберіть стать, активність і ціль')).toBeTruthy();
});

it('shows backend error', async () => {
  api.mockImplementation(async (_path, options) => {
    if (options?.method === 'PUT') throw new ApiError("Немає з'єднання з сервером", 0);
    return profile as never;
  });
  await renderWithQuery(<ProfileScreen />);
  await screen.findByText('2046 ккал');

  await fireEvent.press(screen.getByText('Зберегти'));

  expect(await screen.findByText("Немає з'єднання з сервером")).toBeTruthy();
});
