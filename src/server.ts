import { createApp } from "./app";

const port = readPort(process.env.PORT);

createApp().listen(port, () => {
  console.log(`SaleScout API: http://localhost:${port}`);
});

function readPort(value: string | undefined): number {
  const port = Number(value ?? 3010);

  if (!Number.isInteger(port) || port <= 0 || port >= 65536) {
    return 3010;
  }

  return port;
}
