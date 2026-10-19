import type { Competitor, Product } from "./types";

/** Самый дешёвый конкурент в наличии. При равной цене остаётся первый. */
export function bestInStockCompetitor(product: Product): Competitor | null {
  let best: Competitor | null = null;

  for (const competitor of product.competitors) {
    if (!competitor.inStock) {
      continue;
    }

    if (!best || competitor.price < best.price) {
      best = competitor;
    }
  }

  return best;
}
