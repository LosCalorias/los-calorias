import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

export const colors = {
  primary: '#2E7D32',
  danger: '#C62828',
  text: '#1B1B1B',
  muted: '#6B6B6B',
  border: '#D0D0D0',
  background: '#FFFFFF',
  surface: '#F4F6F4',
};

type FieldProps = TextInputProps & { label: string };

export function Field({ label, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={[styles.button, styles[variant], inactive && styles.inactive]}>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.background} />
      ) : (
        <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

type ChoiceGroupProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
};

export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: ChoiceGroupProps<T>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.choice, selected && styles.choiceSelected]}>
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) {
    return null;
  }
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

export const layout = StyleSheet.create({
  screen: { padding: 16, gap: 16, backgroundColor: colors.background, flexGrow: 1 },
  card: { padding: 16, gap: 8, borderRadius: 12, backgroundColor: colors.surface },
  title: { fontSize: 20, fontWeight: '600', color: colors.text },
  text: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
});

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  button: { borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primary: { backgroundColor: colors.primary },
  secondary: { borderWidth: 1, borderColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  inactive: { opacity: 0.5 },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '600' },
  secondaryText: { color: colors.primary },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.text },
  choiceTextSelected: { color: colors.background },
  error: { color: colors.danger, fontSize: 14 },
});
