import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { calculatePrice } from "./pricing";
import type { Product } from "./types";
import { parseProducts } from "./validate";

function loadSampleProducts(): Product[] {
  const file = fileURLToPath(new URL("../data/products.json", import.meta.url));
  const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
  const parsed = parseProducts(raw);

  if (!parsed.ok) {
    throw new Error("data/products.json не проходит проверку формата");
  }

  return parsed.products;
}

function isJsonSyntaxError(err: unknown): err is SyntaxError {
  return err instanceof SyntaxError;
}

export function createApp(): Express {
  const sampleProducts = loadSampleProducts();
  const app = express();

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.use(express.json({ limit: "1mb" }));

  app.get("/products", (_req, res) => {
    res.json(sampleProducts);
  });

  app.post("/reprice", (req, res) => {
    const parsed = parseProducts(req.body);

    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    res.json(parsed.products.map(calculatePrice));
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (isJsonSyntaxError(err)) {
      res.status(400).json({ error: "Некорректный JSON" });
      return;
    }

    next(err);
  });

  return app;
}
