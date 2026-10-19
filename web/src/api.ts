export const REASONS = [
  "UNDERCUT",
  "AT_MIN",
  "AT_MAX",
  "NO_COMPETITORS",
] as const;

export type Reason = (typeof REASONS)[number];

export interface ComparisonRow {
  sku: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  reason: Reason;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReason(value: unknown): value is Reason {
  return typeof value === "string" && (REASONS as readonly string[]).includes(value);
}

function isErrorPayload(value: unknown): value is { error: string } {
  return isRecord(value) && typeof value.error === "string";
}

async function readJson(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = isErrorPayload(payload)
      ? payload.error
      : `Сервер ответил ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function toRow(product: unknown, result: unknown): ComparisonRow {
  if (!isRecord(product) || !isRecord(result)) {
    throw new Error("Неожиданный ответ сервера");
  }

  if (
    typeof product.sku !== "string" ||
    typeof product.name !== "string" ||
    typeof result.sku !== "string" ||
    typeof result.oldPrice !== "number" ||
    typeof result.newPrice !== "number" ||
    !isReason(result.reason)
  ) {
    throw new Error("Неожиданный ответ сервера");
  }

  if (product.sku !== result.sku) {
    throw new Error("Ответ расчёта не совпал с каталогом");
  }

  return {
    sku: product.sku,
    name: product.name,
    oldPrice: result.oldPrice,
    newPrice: result.newPrice,
    reason: result.reason,
  };
}

export async function loadComparison(): Promise<ComparisonRow[]> {
  let productsResponse: Response;

  try {
    productsResponse = await fetch("/products");
  } catch {
    throw new Error("Не удалось связаться с сервером. Запустите API командой npm run dev.");
  }

  const products = await readJson(productsResponse);

  if (!Array.isArray(products)) {
    throw new Error("Каталог должен быть массивом");
  }

  let repriceResponse: Response;

  try {
    repriceResponse = await fetch("/reprice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products),
    });
  } catch {
    throw new Error("Не удалось связаться с сервером. Запустите API командой npm run dev.");
  }

  const results = await readJson(repriceResponse);

  if (!Array.isArray(results) || results.length !== products.length) {
    throw new Error("Неожиданный ответ расчёта");
  }

  return results.map((result, index) => toRow(products[index], result));
}
