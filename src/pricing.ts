import type { PriceResult, Product } from "./types";

/**
 * Чистая функция: рассчитывает новую цену для одного товара.
 * Правила — см. README, раздел «Правила расчёта цены».
 * Не меняйте сигнатуру и путь к файлу: решение проверяется автотестами.
 */
export function calculatePrice(product: Product): PriceResult {
  const oldPrice = product.myPrice;
  const inStockPrices = product.competitors
    .filter((competitor) => competitor.inStock)
    .map((competitor) => competitor.price);

  if (inStockPrices.length === 0) {
    return {
      sku: product.sku,
      oldPrice,
      newPrice: product.maxPrice,
      reason: "NO_COMPETITORS",
    };
  }

  const best = inStockPrices.reduce((lowest, price) =>
    price < lowest ? price : lowest,
  );
  const candidate = Math.floor(best - product.step);

  if (candidate < product.minPrice) {
    return {
      sku: product.sku,
      oldPrice,
      newPrice: product.minPrice,
      reason: "AT_MIN",
    };
  }

  if (candidate > product.maxPrice) {
    return {
      sku: product.sku,
      oldPrice,
      newPrice: product.maxPrice,
      reason: "AT_MAX",
    };
  }

  return {
    sku: product.sku,
    oldPrice,
    newPrice: candidate,
    reason: "UNDERCUT",
  };
}
