import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, ErrorText, Field, colors, layout } from '@/components/form';
import { useImportRecipe, useSaveRecipe } from './api';
import {
  type DraftForm,
  type IngredientForm,
  NUTRIENT_FIELDS,
  emptyIngredient,
  hasMissingNutrition,
  toDraft,
  toForm,
} from './draft-form';

export function ImportScreen({ onSaved }: { onSaved: (id: number) => void }) {
  const [form, setForm] = useState<DraftForm | null>(null);

  if (!form) {
    return <LinkStep onImported={setForm} />;
  }
  return (
    <DraftStep
      form={form}
      onChange={setForm}
      onCancel={() => setForm(null)}
      onSaved={(id) => {
        setForm(null);
        onSaved(id);
      }}
    />
  );
}

function LinkStep({ onImported }: { onImported: (form: DraftForm) => void }) {
  const importRecipe = useImportRecipe();
  const [url, setUrl] = useState('');
  const [formError, setFormError] = useState('');

  function submit() {
    if (!url.trim()) {
      setFormError('Вставте посилання на відео');
      return;
    }
    setFormError('');
    importRecipe.mutate(url.trim(), { onSuccess: (draft) => onImported(toForm(draft)) });
  }

  return (
    <ScrollView contentContainerStyle={layout.screen} keyboardShouldPersistTaps="handled">
      <Text style={layout.title}>Рецепт з відео</Text>
      <Text style={layout.muted}>Вставте посилання на TikTok або Instagram Reels.</Text>
      <Field
        label="Посилання"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://www.tiktok.com/..."
      />
      <ErrorText>{formError || importRecipe.error?.message}</ErrorText>
      {importRecipe.isPending && (
        <Text style={layout.muted}>Розпізнаємо рецепт, це може зайняти до хвилини…</Text>
      )}
      <Button title="Імпортувати" onPress={submit} loading={importRecipe.isPending} />
    </ScrollView>
  );
}

type DraftStepProps = {
  form: DraftForm;
  onChange: (form: DraftForm) => void;
  onCancel: () => void;
  onSaved: (id: number) => void;
};

function DraftStep({ form, onChange, onCancel, onSaved }: DraftStepProps) {
  const saveRecipe = useSaveRecipe();
  const [formError, setFormError] = useState('');

  function updateIngredient(index: number, patch: Partial<IngredientForm>) {
    onChange({
      ...form,
      ingredients: form.ingredients.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  function updateStep(index: number, value: string) {
    onChange({ ...form, steps: form.steps.map((step, i) => (i === index ? value : step)) });
  }

  function submit() {
    const draft = toDraft(form);
    if (typeof draft === 'string') {
      setFormError(draft);
      return;
    }
    setFormError('');
    saveRecipe.mutate(draft, { onSuccess: (recipe) => onSaved(recipe.id) });
  }

  return (
    <ScrollView contentContainerStyle={layout.screen} keyboardShouldPersistTaps="handled">
      <Text style={layout.muted}>Перевірте та виправте рецепт перед збереженням.</Text>
      <Field label="Назва" value={form.title} onChangeText={(title) => onChange({ ...form, title })} />
      <Field
        label="Порцій"
        value={form.servings}
        onChangeText={(servings) => onChange({ ...form, servings })}
        keyboardType="number-pad"
      />

      <Text style={layout.title}>Інгредієнти</Text>
      {form.ingredients.map((ingredient, index) => (
        <IngredientEditor
          key={index}
          index={index}
          ingredient={ingredient}
          onChange={(patch) => updateIngredient(index, patch)}
          onRemove={() =>
            onChange({ ...form, ingredients: form.ingredients.filter((_, i) => i !== index) })
          }
        />
      ))}
      <Button
        title="Додати інгредієнт"
        variant="secondary"
        onPress={() => onChange({ ...form, ingredients: [...form.ingredients, emptyIngredient()] })}
      />

      <Text style={layout.title}>Приготування</Text>
      {form.steps.map((step, index) => (
        <View key={index} style={{ gap: 8 }}>
          <Field
            label={`Крок ${index + 1}`}
            value={step}
            onChangeText={(value) => updateStep(index, value)}
            multiline
          />
          <Button
            title={`Видалити крок ${index + 1}`}
            variant="secondary"
            onPress={() => onChange({ ...form, steps: form.steps.filter((_, i) => i !== index) })}
          />
        </View>
      ))}
      <Button
        title="Додати крок"
        variant="secondary"
        onPress={() => onChange({ ...form, steps: [...form.steps, ''] })}
      />

      <ErrorText>{formError || saveRecipe.error?.message}</ErrorText>
      <Button title="Зберегти" onPress={submit} loading={saveRecipe.isPending} />
      <Button title="Скасувати" variant="secondary" onPress={onCancel} />
    </ScrollView>
  );
}

type IngredientEditorProps = {
  index: number;
  ingredient: IngredientForm;
  onChange: (patch: Partial<IngredientForm>) => void;
  onRemove: () => void;
};

function IngredientEditor({ index, ingredient, onChange, onRemove }: IngredientEditorProps) {
  const prefix = `Інгредієнт ${index + 1}`;
  return (
    <View style={[layout.card, { gap: 8 }]}>
      <Field
        label="Назва"
        accessibilityLabel={`${prefix}: назва`}
        value={ingredient.name}
        onChangeText={(name) => onChange({ name })}
      />
      <View style={layout.row}>
        <NumberField label="Кількість" prefix={prefix} value={ingredient.quantity} onChange={(quantity) => onChange({ quantity })} />
        <View style={{ flex: 1 }}>
          <Field
            label="Одиниця"
            accessibilityLabel={`${prefix}: одиниця`}
            value={ingredient.unit}
            onChangeText={(unit) => onChange({ unit })}
            autoCapitalize="none"
          />
        </View>
        <NumberField label="Грами" prefix={prefix} value={ingredient.grams} onChange={(grams) => onChange({ grams })} />
      </View>
      {hasMissingNutrition(ingredient) && (
        <Text style={[layout.muted, { color: colors.danger }]}>
          Без даних КБЖУ — заповніть вручну або залиште порожнім
        </Text>
      )}
      <View style={[layout.row, { flexWrap: 'wrap' }]}>
        {NUTRIENT_FIELDS.map(([key, label]) => (
          <NumberField
            key={key}
            label={label}
            prefix={prefix}
            value={ingredient[key]}
            onChange={(value) => onChange({ [key]: value })}
          />
        ))}
      </View>
      <Button title={`Видалити інгредієнт ${index + 1}`} variant="secondary" onPress={onRemove} />
    </View>
  );
}

type NumberFieldProps = {
  label: string;
  prefix: string;
  value: string;
  onChange: (value: string) => void;
};

function NumberField({ label, prefix, value, onChange }: NumberFieldProps) {
  return (
    <View style={{ flex: 1, minWidth: 80 }}>
      <Field
        label={label}
        accessibilityLabel={`${prefix}: ${label}`}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
    </View>
  );
}
