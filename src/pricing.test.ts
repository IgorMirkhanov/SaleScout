import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { calculatePrice } from "./pricing";
import type { Competitor, PriceResult, Product } from "./types";

function readFixture(name: "products.json" | "expected.json"): unknown {
  const file = fileURLToPath(new URL(`../data/${name}`, import.meta.url));
  return JSON.parse(readFileSync(file, "utf8"));
}

function competitor(
  price: number,
  inStock = true,
  seller = "Shop",
): Competitor {
  return { seller, price, inStock };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    sku: "SKU-1",
    name: "Тестовый товар",
    myPrice: 1000,
    minPrice: 100,
    maxPrice: 5000,
    step: 10,
    competitors: [competitor(500)],
    ...overrides,
  };
}

describe("calculatePrice", () => {
  it("совпадает с data/expected.json для примера каталога", () => {
    const products = readFixture("products.json") as Product[];
    const expected = readFixture("expected.json") as PriceResult[];

    const actual = products.map(calculatePrice);

    expect(actual).toEqual(expected);
    for (const [index, result] of actual.entries()) {
      expect(result.oldPrice).toBe(products[index]?.myPrice);
      expect(Number.isInteger(result.newPrice)).toBe(true);
    }
  });

  it("игнорирует конкурентов не в наличии, даже если они дешевле", () => {
    const result = calculatePrice(
      product({
        minPrice: 0,
        maxPrice: 10_000,
        step: 10,
        competitors: [
          competitor(100, false, "Closed"),
          competitor(800, true, "Higher"),
          competitor(600, true, "Best"),
        ],
      }),
    );

    expect(result).toMatchObject({ newPrice: 590, reason: "UNDERCUT" });
  });

  it("при нескольких одинаковых минимальных ценах берёт эту цену один раз", () => {
    const result = calculatePrice(
      product({
        minPrice: 0,
        maxPrice: 10_000,
        step: 5,
        competitors: [competitor(700, true, "A"), competitor(700, true, "B")],
      }),
    );

    expect(result).toMatchObject({ newPrice: 695, reason: "UNDERCUT" });
  });

  it.each([
    {
      title: "пустой список конкурентов",
      competitors: [],
    },
    {
      title: "все конкуренты не в наличии",
      competitors: [competitor(50_000, false), competitor(40_000, false)],
    },
  ])("ставит maxPrice, если $title", ({ competitors }) => {
    const result = calculatePrice(
      product({
        myPrice: 12_000,
        minPrice: 8_000,
        maxPrice: 15_000,
        step: 50,
        competitors,
      }),
    );

    expect(result).toMatchObject({
      oldPrice: 12_000,
      newPrice: 15_000,
      reason: "NO_COMPETITORS",
    });
  });

  it("не даёт текущей цене влиять на новую", () => {
    const base = {
      minPrice: 100,
      maxPrice: 5_000,
      step: 10,
      competitors: [competitor(500)],
    };

    const cheap = calculatePrice(product({ ...base, myPrice: 1 }));
    const expensive = calculatePrice(product({ ...base, myPrice: 999_999 }));

    expect(cheap.newPrice).toBe(expensive.newPrice);
    expect(cheap.reason).toBe(expensive.reason);
    expect(cheap.oldPrice).toBe(1);
    expect(expensive.oldPrice).toBe(999_999);
  });

  it("округляет кандидата вниз до целого тенге", () => {
    const fractional = calculatePrice(
      product({
        minPrice: 330_000,
        maxPrice: 380_000,
        step: 0.5,
        competitors: [competitor(349_999.9)],
      }),
    );
    const notRoundedUp = calculatePrice(
      product({
        minPrice: 0,
        maxPrice: 1_000,
        step: 0,
        competitors: [competitor(100.9)],
      }),
    );

    expect(fractional).toMatchObject({ newPrice: 349_999, reason: "UNDERCUT" });
    expect(notRoundedUp).toMatchObject({ newPrice: 100, reason: "UNDERCUT" });
  });

  it.each([
    {
      title: "внутри диапазона",
      minPrice: 100,
      maxPrice: 1_000,
      newPrice: 490,
      reason: "UNDERCUT" as const,
    },
    {
      title: "ровно minPrice",
      minPrice: 490,
      maxPrice: 1_000,
      newPrice: 490,
      reason: "UNDERCUT" as const,
    },
    {
      title: "на тенге ниже минимума",
      minPrice: 491,
      maxPrice: 1_000,
      newPrice: 491,
      reason: "AT_MIN" as const,
    },
    {
      title: "ровно maxPrice",
      minPrice: 100,
      maxPrice: 490,
      newPrice: 490,
      reason: "UNDERCUT" as const,
    },
    {
      title: "на тенге выше максимума",
      minPrice: 100,
      maxPrice: 489,
      newPrice: 489,
      reason: "AT_MAX" as const,
    },
  ])("ограничивает диапазон: $title", ({ minPrice, maxPrice, newPrice, reason }) => {
    const result = calculatePrice(
      product({
        minPrice,
        maxPrice,
        step: 10,
        competitors: [competitor(500)],
      }),
    );

    expect(result).toMatchObject({ newPrice, reason });
  });

  it("опускается в минимум, если кандидат отрицательный", () => {
    const result = calculatePrice(
      product({
        minPrice: 0,
        maxPrice: 100,
        step: 10,
        competitors: [competitor(5)],
      }),
    );

    expect(result).toMatchObject({ newPrice: 0, reason: "AT_MIN" });
  });

  it("при step = 0 повторяет целую цену лучшего конкурента", () => {
    const result = calculatePrice(
      product({
        minPrice: 0,
        maxPrice: 1_000,
        step: 0,
        competitors: [competitor(250)],
      }),
    );

    expect(result).toMatchObject({ newPrice: 250, reason: "UNDERCUT" });
  });

  it("не меняет входной товар", () => {
    const item = product();
    const snapshot = structuredClone(item);

    calculatePrice(item);

    expect(item).toEqual(snapshot);
  });
});
