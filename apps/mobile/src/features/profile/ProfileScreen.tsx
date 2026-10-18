import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, ChoiceGroup, ErrorText, Field, colors, layout } from '@/components/form';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  ACTIVITY_OPTIONS,
  type ActivityLevel,
  type DailyNorm,
  GOAL_OPTIONS,
  type Goal,
  type Profile,
  type ProfileUpdate,
  SEX_OPTIONS,
  type Sex,
  useProfile,
  useSaveProfile,
} from './api';

type FormState = {
  sex: Sex | null;
  age: string;
  height: string;
  weight: string;
  activity: ActivityLevel | null;
  goal: Goal | null;
};

const EMPTY_FORM: FormState = {
  sex: null,
  age: '',
  height: '',
  weight: '',
  activity: null,
  goal: null,
};

export function ProfileScreen() {
  const profile = useProfile();

  if (profile.isPending) {
    return (
      <View style={layout.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (profile.isError) {
    return (
      <View style={[layout.center, { gap: 16 }]}>
        <ErrorText>{profile.error.message}</ErrorText>
        <SignOutButton />
      </View>
    );
  }
  return <ProfileForm profile={profile.data} />;
}

function ProfileForm({ profile }: { profile: Profile | null }) {
  const saveProfile = useSaveProfile();
  const [form, setForm] = useState<FormState>(() => toForm(profile));
  const [formError, setFormError] = useState('');

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    const result = validate(form);
    if (typeof result === 'string') {
      setFormError(result);
      return;
    }
    setFormError('');
    saveProfile.mutate(result);
  }

  return (
    <ScrollView contentContainerStyle={layout.screen}>
      {profile ? (
        <NormCard norm={profile.daily_norm} />
      ) : (
        <Text style={layout.text}>Заповніть профіль, щоб розрахувати денну норму.</Text>
      )}
      <ChoiceGroup label="Стать" options={SEX_OPTIONS} value={form.sex} onChange={(v) => update('sex', v)} />
      <Field label="Вік, років" value={form.age} onChangeText={(v) => update('age', v)} keyboardType="numeric" />
      <Field label="Зріст, см" value={form.height} onChangeText={(v) => update('height', v)} keyboardType="numeric" />
      <Field label="Вага, кг" value={form.weight} onChangeText={(v) => update('weight', v)} keyboardType="numeric" />
      <ChoiceGroup
        label="Активність"
        options={ACTIVITY_OPTIONS}
        value={form.activity}
        onChange={(v) => update('activity', v)}
      />
      <ChoiceGroup label="Ціль" options={GOAL_OPTIONS} value={form.goal} onChange={(v) => update('goal', v)} />
      <ErrorText>{formError || saveProfile.error?.message}</ErrorText>
      <Button title="Зберегти" onPress={submit} loading={saveProfile.isPending} />
      <SignOutButton />
    </ScrollView>
  );
}

function SignOutButton() {
  const { signOut } = useAuth();
  return <Button title="Вийти" variant="secondary" onPress={() => void signOut()} />;
}

function NormCard({ norm }: { norm: DailyNorm }) {
  return (
    <View style={layout.card}>
      <Text style={layout.muted}>Денна норма</Text>
      <Text style={[layout.title, { fontSize: 32 }]}>{norm.kcal} ккал</Text>
      <Text style={layout.text}>
        Б {norm.protein} г · Ж {norm.fat} г · В {norm.carbs} г
      </Text>
    </View>
  );
}

function toForm(profile: Profile | null): FormState {
  if (!profile) {
    return EMPTY_FORM;
  }
  return {
    sex: profile.sex,
    age: String(profile.age),
    height: String(profile.height_cm),
    weight: String(profile.weight_kg),
    activity: profile.activity_level,
    goal: profile.goal,
  };
}

function validate(form: FormState): ProfileUpdate | string {
  if (!form.sex || !form.activity || !form.goal) {
    return 'Оберіть стать, активність і ціль';
  }
  const age = parseNumber(form.age);
  const height = parseNumber(form.height);
  const weight = parseNumber(form.weight);
  if (age === undefined || !Number.isInteger(age) || age < 14 || age > 100) {
    return 'Вік — ціле число від 14 до 100';
  }
  if (height === undefined || height < 100 || height > 250) {
    return 'Зріст — від 100 до 250 см';
  }
  if (weight === undefined || weight < 30 || weight > 300) {
    return 'Вага — від 30 до 300 кг';
  }
  return {
    sex: form.sex,
    age,
    height_cm: height,
    weight_kg: weight,
    activity_level: form.activity,
    goal: form.goal,
  };
}

function parseNumber(value: string): number | undefined {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
}
