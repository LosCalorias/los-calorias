import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';

let currentToken: string | null = null;

export function getToken(): string | null {
  return currentToken;
}

export async function loadToken(): Promise<string | null> {
  currentToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return currentToken;
}

export async function saveToken(token: string | null): Promise<void> {
  currentToken = token;
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
