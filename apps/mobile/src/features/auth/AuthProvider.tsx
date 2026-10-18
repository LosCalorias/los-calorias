import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { setUnauthorizedListener } from '@/api/client';
import { loadToken, saveToken } from '@/api/token';

type AuthContextValue = {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadToken()
      .catch(() => null)
      .then((stored) => {
        setToken(stored);
        setIsLoading(false);
      });
  }, []);

  const signIn = useCallback(
    async (newToken: string) => {
      await saveToken(newToken);
      queryClient.clear();
      setToken(newToken);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    await saveToken(null);
    queryClient.clear();
    setToken(null);
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedListener(() => void signOut());
    return () => setUnauthorizedListener(null);
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
