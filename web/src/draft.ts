export interface Draft {
  step: string;
  minPrice: string;
}

export function readDraftNumber(raw: string): number | null {
  if (raw.trim() === "") {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function draftMessage(draft: Draft, maxPrice: number): string | null {
  const step = readDraftNumber(draft.step);
  const minPrice = readDraftNumber(draft.minPrice);

  if (step === null || minPrice === null) {
    return "Введите число";
  }

  if (step < 0) {
    return "Шаг не может быть отрицательным";
  }

  if (minPrice > maxPrice) {
    return "Минимум выше максимума";
  }

  return null;
}
