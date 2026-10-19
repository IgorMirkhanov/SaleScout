# SaleScout — мини-версия прайс-бота

Бот смотрит цены конкурентов в наличии и предлагает новую цену продавца: на шаг дешевле лучшего предложения, но не ниже минимума и не выше максимума.

## Запуск

Нужны Node.js 20+ и npm.

```bash
npm install
npm test
npm run dev
```

- Страница: http://localhost:5173
- API: http://localhost:3010

`npm run dev` поднимает оба процесса. По отдельности: `npm run dev:api` и `npm run dev:web`. Проверка типов: `npm run typecheck`.

Страница забирает демо-каталог `GET /products` и показывает таблицу по ответу `POST /reprice`. Каталог лежит в `data/products.json`, ожидаемый результат — в `data/expected.json`.

Пример запроса:

```bash
curl -X POST http://localhost:3010/reprice -H "Content-Type: application/json" --data-binary @data/products.json
```

## Что где лежит

- `src/pricing.ts` — чистая функция `calculatePrice`. Сигнатуру и путь менять нельзя: их проверяют автотесты.
- `src/app.ts` — Express, `POST /reprice` и `GET /products`.
- `web/` — React + Vite, таблица «было / стало».
- `src/*.test.ts` — тесты Vitest.

## Правила расчёта цены

`myPrice` на расчёт не влияет и возвращается как `oldPrice`. Учитываются только конкуренты с `inStock: true`.

1. Таких конкурентов нет → `newPrice = maxPrice`, причина `NO_COMPETITORS`.
2. Иначе `best` — минимальная цена среди них.
3. Кандидат: `floor(best - step)`, округление вниз до целого тенге.
4. `candidate < minPrice` → `minPrice`, `AT_MIN`.
5. `candidate > maxPrice` → `maxPrice`, `AT_MAX`.
6. Иначе кандидат остаётся, причина `UNDERCUT`. Границы диапазона входят в `UNDERCUT`.

## API

`POST /reprice`, `Content-Type: application/json`, тело — массив товаров. Ответ `200` — массив результатов в том же порядке. Если тело не массив, товар записан не в том формате или JSON сломан — ответ `400`.
