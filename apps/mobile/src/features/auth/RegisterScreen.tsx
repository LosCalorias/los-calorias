import { router } from 'expo-router';
import { AuthForm } from './AuthForm';
import { useAuth } from './AuthProvider';
import { MIN_PASSWORD_LENGTH, useRegister } from './api';

export function RegisterScreen() {
  const { signIn } = useAuth();
  const register = useRegister();

  return (
    <AuthForm
      title="Реєстрація"
      submitTitle="Зареєструватися"
      switchText="Вже є обліковий запис? Увійти"
      switchHref="/login"
      minPasswordLength={MIN_PASSWORD_LENGTH}
      loading={register.isPending}
      error={register.error?.message}
      onSubmit={(credentials) =>
        register.mutate(credentials, {
          onSuccess: async ({ access_token }) => {
            await signIn(access_token);
            router.replace('/profile');
          },
        })
      }
    />
  );
}
