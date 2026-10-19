import { useCallback, useEffect, useRef, useState } from "react";
import { bestInStockCompetitor } from "../../src/offer";
import {
  fetchCatalog,
  repriceCatalog,
  type CatalogProduct,
  type PriceResult,
  type Reason,
} from "./api";
import { draftMessage, readDraftNumber, type Draft } from "./draft";
import { formatDelta, formatOfferPrice, formatPrice, priceDirection } from "./format";

const REASON_LABEL: Record<Reason, string> = {
  UNDERCUT: "Дешевле конкурента",
  AT_MIN: "На минимуме",
  AT_MAX: "На максимуме",
  NO_COMPETITORS: "Нет конкурентов",
};

interface Stats {
  total: number;
  undercut: number;
  atMin: number;
  atMax: number;
  none: number;
}

function countReasons(results: PriceResult[]): Stats {
  return {
    total: results.length,
    undercut: results.filter((result) => result.reason === "UNDERCUT").length,
    atMin: results.filter((result) => result.reason === "AT_MIN").length,
    atMax: results.filter((result) => result.reason === "AT_MAX").length,
    none: results.filter((result) => result.reason === "NO_COMPETITORS").length,
  };
}

function draftsFrom(products: CatalogProduct[]): Draft[] {
  return products.map((product) => ({
    step: String(product.step),
    minPrice: String(product.minPrice),
  }));
}

export function App() {
  const [products, setProducts] = useState<CatalogProduct[] | null>(null);
  const [results, setResults] = useState<PriceResult[] | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState(false);
  const requestId = useRef(0);

  const quote = useCallback(async (nextProducts: CatalogProduct[]) => {
    const id = requestId.current + 1;
    requestId.current = id;
    setPricing(true);

    try {
      const priced = await repriceCatalog(nextProducts);
      if (requestId.current !== id) {
        return;
      }
      setResults(priced);
      setError(null);
    } catch (caught) {
      if (requestId.current !== id) {
        return;
      }
      setError(caught instanceof Error ? caught.message : "Неизвестная ошибка");
    } finally {
      if (requestId.current === id) {
        setPricing(false);
      }
    }
  }, []);

  const reload = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    setLoading(true);
    setError(null);

    try {
      const catalog = await fetchCatalog();
      if (requestId.current !== id) {
        return;
      }
      setProducts(catalog);
      setDrafts(draftsFrom(catalog));
      const priced = await repriceCatalog(catalog);
      if (requestId.current !== id) {
        return;
      }
      setResults(priced);
    } catch (caught) {
      if (requestId.current !== id) {
        return;
      }
      setProducts(null);
      setResults(null);
      setDrafts([]);
      setError(caught instanceof Error ? caught.message : "Неизвестная ошибка");
    } finally {
      if (requestId.current === id) {
        setLoading(false);
        setPricing(false);
      }
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const editDraft = useCallback(
    (index: number, field: keyof Draft, raw: string) => {
      if (!products || !drafts[index]) {
        return;
      }

      const nextDrafts = drafts.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, [field]: raw } : draft,
      );
      setDrafts(nextDrafts);

      const draft = nextDrafts[index];
      const product = products[index];
      if (!draft || !product || draftMessage(draft, product.maxPrice)) {
        return;
      }

      const step = readDraftNumber(draft.step);
      const minPrice = readDraftNumber(draft.minPrice);
      if (step === null || minPrice === null) {
        return;
      }

      const nextProducts = products.map((item, itemIndex) =>
        itemIndex === index ? { ...item, step, minPrice } : item,
      );
      setProducts(nextProducts);
      void quote(nextProducts);
    },
    [drafts, products, quote],
  );

  const stats = results ? countReasons(results) : null;

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <p className="brand-name">SaleScout</p>
            <p className="brand-note">Прайс-бот для Kaspi</p>
          </div>
        </div>
        <button
          type="button"
          className="refresh"
          onClick={() => {
            void reload();
          }}
          disabled={loading}
        >
          {loading ? "Считаем…" : "Сбросить"}
        </button>
      </header>

      <main className="page">
        <section className="intro">
          <h1>Было / стало</h1>
          <p>
            Новая цена ставится на шаг ниже самого дешёвого конкурента в наличии
            и не выходит за минимум и максимум. Шаг и минимум можно поменять —
            таблица снова спросит API.
          </p>
        </section>

        {stats ? (
          <section className="stats" aria-label="Сводка">
            <Stat label="Товаров" value={stats.total} />
            <Stat label="Дешевле конкурента" value={stats.undercut} />
            <Stat label="На минимуме" value={stats.atMin} />
            <Stat label="На максимуме" value={stats.atMax} />
            <Stat label="Нет конкурентов" value={stats.none} />
          </section>
        ) : null}

        <section className="panel" aria-live="polite">
          {loading && !products ? (
            <p className="status">Загружаем каталог и считаем цены…</p>
          ) : null}
          {error ? (
            <div className="error">
              <p>{error}</p>
              <button type="button" onClick={() => void reload()}>
                Повторить
              </button>
            </div>
          ) : null}
          {products && products.length === 0 ? (
            <p className="status">В каталоге нет товаров.</p>
          ) : null}
          {products && results && products.length > 0 ? (
            <PriceTable
              products={products}
              results={results}
              drafts={drafts}
              pricing={pricing}
              disabled={loading}
              onEdit={editDraft}
            />
          ) : null}
        </section>

        <dl className="legend">
          <div>
            <dt>Дешевле конкурента</dt>
            <dd>Кандидат внутри минимума и максимума.</dd>
          </div>
          <div>
            <dt>На минимуме</dt>
            <dd>Ниже минимума опускаться нельзя.</dd>
          </div>
          <div>
            <dt>На максимуме</dt>
            <dd>Выше максимума подниматься нельзя.</dd>
          </div>
          <div>
            <dt>Нет конкурентов</dt>
            <dd>В наличии никого нет — ставим максимум.</dd>
          </div>
        </dl>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="stat">
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </article>
  );
}

function PriceTable({
  products,
  results,
  drafts,
  pricing,
  disabled,
  onEdit,
}: {
  products: CatalogProduct[];
  results: PriceResult[];
  drafts: Draft[];
  pricing: boolean;
  disabled: boolean;
  onEdit: (index: number, field: keyof Draft, raw: string) => void;
}) {
  return (
    <div className="table-wrap">
      <div className="panel-head">
        <h2>Сравнение старой и новой цены</h2>
        {pricing ? <span className="pending">Считаем новую цену…</span> : null}
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">SKU</th>
            <th scope="col">Название</th>
            <th scope="col" className="num">
              Старая цена
            </th>
            <th scope="col" className="num">
              Новая цена
            </th>
            <th scope="col">Причина</th>
            <th scope="col">Конкурент</th>
            <th scope="col" className="num">
              Шаг
            </th>
            <th scope="col" className="num">
              Диапазон
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => {
            const result = results[index];
            const draft = drafts[index];
            if (!result || !draft) {
              return null;
            }

            const offer = bestInStockCompetitor(product);
            const inStockCount = product.competitors.filter((competitor) => competitor.inStock).length;
            const problem = draftMessage(draft, product.maxPrice);
            const direction = priceDirection(result.oldPrice, result.newPrice);

            return (
              <tr key={product.sku}>
                <td className="sku">{product.sku}</td>
                <td>{product.name}</td>
                <td className="num">{formatPrice(result.oldPrice)}</td>
                <td className={`num price-${direction}`}>
                  <span className="price">{formatPrice(result.newPrice)}</span>
                  <span className="delta">{formatDelta(result.oldPrice, result.newPrice)}</span>
                </td>
                <td>
                  <span className={`pill pill-${result.reason}`} title={result.reason}>
                    {REASON_LABEL[result.reason]}
                  </span>
                </td>
                <td>
                  {offer ? (
                    <>
                      <span className="seller">{offer.seller}</span>
                      <span className="delta">{formatOfferPrice(offer.price)}</span>
                      {inStockCount > 1 ? (
                        <span className="delta">ещё {inStockCount - 1} в наличии</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="muted">Нет в наличии</span>
                  )}
                </td>
                <td className="num">
                  <input
                    className="field"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    aria-label={`Шаг для ${product.name}`}
                    aria-invalid={problem !== null}
                    disabled={disabled}
                    value={draft.step}
                    onChange={(event) => {
                      onEdit(index, "step", event.target.value);
                    }}
                  />
                </td>
                <td className="num">
                  <span className="range">
                    <input
                      className="field"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      aria-label={`Минимум для ${product.name}`}
                      aria-invalid={problem !== null}
                      disabled={disabled}
                      value={draft.minPrice}
                      onChange={(event) => {
                        onEdit(index, "minPrice", event.target.value);
                      }}
                    />
                    <span className="range-sep">—</span>
                    <span>{formatPrice(product.maxPrice)}</span>
                  </span>
                  {problem ? <span className="hint">{problem}</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
