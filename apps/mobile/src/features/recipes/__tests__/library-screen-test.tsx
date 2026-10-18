import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError, apiRequest } from '@/api/client';
import { renderWithQuery } from '@/test/render';
import { LibraryScreen } from '../LibraryScreen';

jest.mock('@/api/client', () => ({
  ...jest.requireActual('@/api/client'),
  apiRequest: jest.fn(),
}));

const api = jest.mocked(apiRequest);

beforeEach(() => api.mockReset());

it('lists saved recipes and opens one', async () => {
  api.mockResolvedValue([
    { id: 3, title: 'Млинці', servings: 4, kcal_per_serving: 364.4 },
    { id: 5, title: 'Борщ', servings: 6, kcal_per_serving: 210 },
  ]);
  const onOpen = jest.fn();
  await renderWithQuery(<LibraryScreen onOpen={onOpen} />);

  expect(await screen.findByText('Млинці')).toBeTruthy();
  expect(screen.getByText('364 ккал на порцію · 4 порц.')).toBeTruthy();
  expect(screen.getByText('Борщ')).toBeTruthy();
  expect(api).toHaveBeenCalledWith('/recipes');

  await fireEvent.press(screen.getByText('Борщ'));

  expect(onOpen).toHaveBeenCalledWith(5);
});

it('shows a hint when the library is empty', async () => {
  api.mockResolvedValue([]);
  await renderWithQuery(<LibraryScreen onOpen={jest.fn()} />);

  expect(
    await screen.findByText('Ще немає рецептів. Імпортуйте перший у вкладці «Імпорт».'),
  ).toBeTruthy();
});

it('shows a loading error', async () => {
  api.mockRejectedValue(new ApiError("Немає з'єднання з сервером", 0));
  await renderWithQuery(<LibraryScreen onOpen={jest.fn()} />);

  expect(await screen.findByText("Немає з'єднання з сервером")).toBeTruthy();
});
