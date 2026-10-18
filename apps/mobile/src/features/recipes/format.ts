import type { Macros } from '@/features/meals/api';
import type { IngredientDraft } from './api';

export function formatMacros({ kcal, protein, fat, carbs }: Macros): string {
  return `${Math.round(kcal)} ккал · Б ${Math.round(protein)} · Ж ${Math.round(fat)} · В ${Math.round(carbs)}`;
}

export function formatAmount({ quantity, unit, grams }: IngredientDraft): string {
  const parts: string[] = [];
  if (quantity !== null) {
    parts.push([formatNumber(quantity), unit].filter(Boolean).join(' '));
  }
  if (grams !== null && unit !== 'g') {
    parts.push(`${formatNumber(grams)} г`);
  }
  return parts.join(' · ');
}

function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}
