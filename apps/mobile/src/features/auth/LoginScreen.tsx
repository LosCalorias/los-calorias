import { AuthForm } from './AuthForm';
import { useAuth } from './AuthProvider';
import { useLogin } from './api';

export function LoginScreen() {
  const { signIn } = useAuth();
  const login = useLogin();

  return (
    <AuthForm
      title="Вхід"
      submitTitle="Увійти"
      switchText="Немає облікового запису? Зареєструватися"
      switchHref="/register"
      loading={login.isPending}
      error={login.error?.message}
      onSubmit={(credentials) =>
        login.mutate(credentials, { onSuccess: ({ access_token }) => signIn(access_token) })
      }
    />
  );
}
