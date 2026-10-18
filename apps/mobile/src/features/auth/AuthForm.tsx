import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Button, ErrorText, Field, colors, layout } from '@/components/form';
import type { Credentials } from './api';

type AuthFormProps = {
  title: string;
  submitTitle: string;
  switchText: string;
  switchHref: Href;
  minPasswordLength?: number;
  loading: boolean;
  error?: string;
  onSubmit: (credentials: Credentials) => void;
};

export function AuthForm({
  title,
  submitTitle,
  switchText,
  switchHref,
  minPasswordLength,
  loading,
  error,
  onSubmit,
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  function submit() {
    if (!email.trim() || !password) {
      setFormError('Вкажіть email і пароль');
      return;
    }
    if (minPasswordLength && password.length < minPasswordLength) {
      setFormError(`Пароль має бути не коротшим за ${minPasswordLength} символів`);
      return;
    }
    setFormError('');
    onSubmit({ email: email.trim(), password });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[layout.screen, { justifyContent: 'center' }]}>
        <Text style={[layout.title, { fontSize: 28 }]}>{title}</Text>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Field
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <ErrorText>{formError || error}</ErrorText>
        <Button title={submitTitle} onPress={submit} loading={loading} />
        <Link href={switchHref} replace style={{ color: colors.primary, textAlign: 'center' }}>
          {switchText}
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
