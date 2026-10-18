import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/api/client';

export type Credentials = { email: string; password: string };

type Token = { access_token: string; token_type: string };

export const MIN_PASSWORD_LENGTH = 8;

export function useLogin() {
  return useMutation({
    mutationFn: (credentials: Credentials) =>
      apiRequest<Token>('/auth/login', { method: 'POST', body: credentials }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (credentials: Credentials) =>
      apiRequest<Token>('/auth/register', { method: 'POST', body: credentials }),
  });
}
