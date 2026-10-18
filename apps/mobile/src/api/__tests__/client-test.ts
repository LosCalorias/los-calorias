import { ApiError, API_URL, apiRequest, setUnauthorizedListener } from '../client';
import { getToken } from '../token';

jest.mock('../token', () => ({ getToken: jest.fn() }));

const fetchMock = jest.fn();
globalThis.fetch = fetchMock;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  jest.mocked(getToken).mockReturnValue(null);
  setUnauthorizedListener(null);
});

it('sends json body and returns parsed response', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

  const result = await apiRequest('/auth/login', { method: 'POST', body: { email: 'a@b.c' } });

  expect(result).toEqual({ ok: true });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${API_URL}/auth/login`);
  expect(init.method).toBe('POST');
  expect(init.body).toBe('{"email":"a@b.c"}');
  expect(init.headers['Content-Type']).toBe('application/json');
  expect(init.headers.Authorization).toBeUndefined();
});

it('adds bearer token and query string', async () => {
  jest.mocked(getToken).mockReturnValue('token-123');
  fetchMock.mockResolvedValue(jsonResponse(200, []));

  await apiRequest('/meals', { query: { date: '2026-10-18' } });

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${API_URL}/meals?date=2026-10-18`);
  expect(init.headers.Authorization).toBe('Bearer token-123');
});

it('throws backend detail as error message', async () => {
  fetchMock.mockResolvedValue(jsonResponse(409, { detail: 'Цей email уже використовується' }));

  await expect(apiRequest('/auth/register', { method: 'POST', body: {} })).rejects.toEqual(
    new ApiError('Цей email уже використовується', 409),
  );
});

it('uses generic message for validation errors', async () => {
  fetchMock.mockResolvedValue(jsonResponse(422, { detail: [{ msg: 'field required' }] }));

  await expect(apiRequest('/profile', { method: 'PUT', body: {} })).rejects.toThrow(
    'Перевірте введені дані',
  );
});

it('reports network failure', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));

  await expect(apiRequest('/health')).rejects.toThrow("Немає з'єднання з сервером");
});

it('returns undefined for 204', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

  await expect(apiRequest('/recipes/1', { method: 'DELETE' })).resolves.toBeUndefined();
});

it('notifies listener when a signed-in request gets 401', async () => {
  const listener = jest.fn();
  setUnauthorizedListener(listener);
  jest.mocked(getToken).mockReturnValue('expired');
  fetchMock.mockResolvedValue(jsonResponse(401, { detail: 'Потрібно увійти' }));

  await expect(apiRequest('/profile')).rejects.toThrow('Потрібно увійти');
  expect(listener).toHaveBeenCalledTimes(1);
});

it('does not notify listener for failed login without token', async () => {
  const listener = jest.fn();
  setUnauthorizedListener(listener);
  fetchMock.mockResolvedValue(jsonResponse(401, { detail: 'Невірний email або пароль' }));

  await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toThrow();
  expect(listener).not.toHaveBeenCalled();
});
