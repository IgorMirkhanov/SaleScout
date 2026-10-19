import type { Competitor, Product } from "./types";

export interface ValidationSuccess {
  ok: true;
  products: Product[];
}

export interface ValidationFailure {
  ok: false;
  error: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCompetitor(value: unknown): value is Competitor {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.seller === "string" &&
    isFiniteNumber(value.price) &&
    typeof value.inStock === "boolean"
  );
}

function isProduct(value: unknown): value is Product {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.sku === "string" &&
    typeof value.name === "string" &&
    isFiniteNumber(value.myPrice) &&
    isFiniteNumber(value.minPrice) &&
    isFiniteNumber(value.maxPrice) &&
    isFiniteNumber(value.step) &&
    Array.isArray(value.competitors) &&
    value.competitors.every(isCompetitor)
  );
}

export function parseProducts(
  body: unknown,
): ValidationSuccess | ValidationFailure {
  if (!Array.isArray(body)) {
    return { ok: false, error: "Тело запроса должно быть массивом товаров" };
  }

  for (let index = 0; index < body.length; index += 1) {
    if (!isProduct(body[index])) {
      return {
        ok: false,
        error: `Некорректный товар в позиции ${index + 1}`,
      };
    }
  }

  return { ok: true, products: body };
}
