import { useCallback, useEffect, useState } from "react";
import { loadComparison, type ComparisonRow, type Reason } from "./api";
import { formatDelta, formatPrice, priceDirection } from "./format";

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

function countReasons(rows: ComparisonRow[]): Stats {
  return {
    total: rows.length,
    undercut: rows.filter((row) => row.reason === "UNDERCUT").length,
    atMin: rows.filter((row) => row.reason === "AT_MIN").length,
    atMax: rows.filter((row) => row.reason === "AT_MAX").length,
    none: rows.filter((row) => row.reason === "NO_COMPETITORS").length,
  };
}

export function App() {
  const [rows, setRows] = useState<ComparisonRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setRows(await loadComparison());
    } catch (caught) {
      setRows(null);
      setError(caught instanceof Error ? caught.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stats = rows ? countReasons(rows) : null;

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
            void refresh();
          }}
          disabled={loading}
        >
          {loading ? "Считаем…" : "Пересчитать"}
        </button>
      </header>

      <main className="page">
        <section className="intro">
          <h1>Было / стало</h1>
          <p>
            Новая цена ставится на шаг ниже самого дешёвого конкурента в наличии
            и не выходит за минимум и максимум продавца.
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
          {loading && !rows ? <p className="status">Загружаем каталог и считаем цены…</p> : null}
          {error ? (
            <div className="error">
              <p>{error}</p>
              <button type="button" onClick={() => void refresh()}>
                Повторить
              </button>
            </div>
          ) : null}
          {rows && rows.length === 0 ? (
            <p className="status">В каталоге нет товаров.</p>
          ) : null}
          {rows && rows.length > 0 ? <PriceTable rows={rows} /> : null}
        </section>

        <dl className="legend">
          <div>
            <dt>Дешевле конкурента</dt>
            <dd>Кандидат внутри минимума и максимума.</dd>
          </div>
          <div>
            <dt>На минимуме</dt>
            <dd>Ниже minPrice опускаться нельзя.</dd>
          </div>
          <div>
            <dt>На максимуме</dt>
            <dd>Выше maxPrice подниматься нельзя.</dd>
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

function PriceTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <caption>Сравнение старой и новой цены</caption>
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
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const direction = priceDirection(row.oldPrice, row.newPrice);

            return (
              <tr key={row.sku}>
                <td className="sku">{row.sku}</td>
                <td>{row.name}</td>
                <td className="num">{formatPrice(row.oldPrice)}</td>
                <td className={`num price-${direction}`}>
                  <span className="price">{formatPrice(row.newPrice)}</span>
                  <span className="delta">{formatDelta(row.oldPrice, row.newPrice)}</span>
                </td>
                <td>
                  <span className={`pill pill-${row.reason}`} title={row.reason}>
                    {REASON_LABEL[row.reason]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
