export const REASONS = [
  "UNDERCUT",
  "AT_MIN",
  "AT_MAX",
  "NO_COMPETITORS",
] as const;

export type Reason = (typeof REASONS)[number];

export interface Competitor {
  seller: string;
  price: number;
  inStock: boolean;
}

export interface CatalogProduct {
  sku: string;
  name: string;
  myPrice: number;
  minPrice: number;
  maxPrice: number;
  step: number;
  competitors: Competitor[];
}

export interface PriceResult {
  sku: string;
  oldPrice: number;
  newPrice: number;
  reason: Reason;
}

const networkError = "Не удалось связаться с сервером. Запустите API командой npm run dev.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReason(value: unknown): value is Reason {
  return typeof value === "string" && (REASONS as readonly string[]).includes(value);
}

function isCompetitor(value: unknown): value is Competitor {
  return (
    isRecord(value) &&
    typeof value.seller === "string" &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    typeof value.inStock === "boolean"
  );
}

function isCatalogProduct(value: unknown): value is CatalogProduct {
  return (
    isRecord(value) &&
    typeof value.sku === "string" &&
    typeof value.name === "string" &&
    typeof value.myPrice === "number" &&
    typeof value.minPrice === "number" &&
    typeof value.maxPrice === "number" &&
    typeof value.step === "number" &&
    Array.isArray(value.competitors) &&
    value.competitors.every(isCompetitor)
  );
}

function isPriceResult(value: unknown): value is PriceResult {
  return (
    isRecord(value) &&
    typeof value.sku === "string" &&
    typeof value.oldPrice === "number" &&
    typeof value.newPrice === "number" &&
    isReason(value.reason)
  );
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

export async function fetchCatalog(): Promise<CatalogProduct[]> {
  let response: Response;

  try {
    response = await fetch("/products");
  } catch {
    throw new Error(networkError);
  }

  const payload = await readJson(response);

  if (!Array.isArray(payload) || !payload.every(isCatalogProduct)) {
    throw new Error("Неожиданный ответ каталога");
  }

  return payload;
}

export async function repriceCatalog(products: CatalogProduct[]): Promise<PriceResult[]> {
  let response: Response;

  try {
    response = await fetch("/reprice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products),
    });
  } catch {
    throw new Error(networkError);
  }

  const payload = await readJson(response);

  if (!Array.isArray(payload) || payload.length !== products.length || !payload.every(isPriceResult)) {
    throw new Error("Неожиданный ответ расчёта");
  }

  payload.forEach((result, index) => {
    if (result.sku !== products[index]?.sku) {
      throw new Error("Ответ расчёта не совпал с каталогом");
    }
  });

  return payload;
}
