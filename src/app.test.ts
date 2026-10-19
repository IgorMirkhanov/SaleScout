import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { PriceResult, Product } from "./types";

function readFixture(name: "products.json" | "expected.json"): unknown {
  const file = fileURLToPath(new URL(`../data/${name}`, import.meta.url));
  return JSON.parse(readFileSync(file, "utf8"));
}

const app = createApp();
const products = readFixture("products.json") as Product[];
const expected = readFixture("expected.json") as PriceResult[];

describe("POST /reprice", () => {
  it("возвращает цены в том же порядке, что и товары", async () => {
    const reversed = [...products].reverse();

    const response = await request(app).post("/reprice").send(reversed);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual(
      reversed.map((product) =>
        expected.find((result) => result.sku === product.sku),
      ),
    );
  });

  it("считает пример каталога так же, как data/expected.json", async () => {
    const response = await request(app).post("/reprice").send(products);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expected);
  });

  it("принимает пустой массив", async () => {
    const response = await request(app).post("/reprice").send([]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("отвечает 400, если тело не массив", async () => {
    const response = await request(app)
      .post("/reprice")
      .send({ sku: "IPH15-128-BLK" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Тело запроса должно быть массивом товаров",
    });
  });

  it("отвечает 400 на некорректный JSON", async () => {
    const response = await request(app)
      .post("/reprice")
      .set("Content-Type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Некорректный JSON" });
  });

  it("отвечает 400, если элемент массива не похож на товар", async () => {
    const response = await request(app)
      .post("/reprice")
      .send([{ sku: "ONLY-SKU" }]);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Некорректный товар в позиции 1",
    });
  });
});

describe("GET /products", () => {
  it("отдаёт демо-каталог", async () => {
    const response = await request(app).get("/products");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(products);
  });
});
