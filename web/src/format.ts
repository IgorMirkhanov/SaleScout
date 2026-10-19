const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const preciseMoney = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatPrice(value: number): string {
  return `${money.format(value)}\u00a0₸`;
}

export function formatOfferPrice(value: number): string {
  const formatter = Number.isInteger(value) ? money : preciseMoney;
  return `${formatter.format(value)}\u00a0₸`;
}

export function formatDelta(oldPrice: number, newPrice: number): string {
  const delta = newPrice - oldPrice;

  if (delta === 0) {
    return "без изменений";
  }

  const sign = delta > 0 ? "+" : "−";
  return `${sign}${money.format(Math.abs(delta))}\u00a0₸`;
}

export function priceDirection(
  oldPrice: number,
  newPrice: number,
): "up" | "down" | "flat" {
  if (newPrice > oldPrice) {
    return "up";
  }

  if (newPrice < oldPrice) {
    return "down";
  }

  return "flat";
}
