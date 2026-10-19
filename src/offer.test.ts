import { describe, expect, it } from "vitest";
import { bestInStockCompetitor } from "./offer";
import type { Competitor, Product } from "./types";

function competitor(seller: string, price: number, inStock = true): Competitor {
  return { seller, price, inStock };
}

function product(competitors: Competitor[]): Product {
  return {
    sku: "SKU-1",
    name: "Товар",
    myPrice: 1000,
    minPrice: 100,
    maxPrice: 5000,
    step: 10,
    competitors,
  };
}

describe("bestInStockCompetitor", () => {
  it("возвращает null, если в наличии никого нет", () => {
    expect(bestInStockCompetitor(product([]))).toBeNull();
    expect(
      bestInStockCompetitor(product([competitor("Closed", 10, false)])),
    ).toBeNull();
  });

  it("игнорирует более дешёвого конкурента не в наличии", () => {
    const best = bestInStockCompetitor(
      product([
        competitor("Closed", 100, false),
        competitor("Higher", 800),
        competitor("Best", 600),
      ]),
    );

    expect(best).toEqual(competitor("Best", 600));
  });

  it("при равной цене оставляет первого", () => {
    const best = bestInStockCompetitor(
      product([competitor("First", 700), competitor("Second", 700)]),
    );

    expect(best?.seller).toBe("First");
  });
});
