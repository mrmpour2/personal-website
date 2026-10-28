import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = path.resolve(websiteRoot, "..", "dashboard", "backend");
const { createFixture } = await import(pathToFileURL(path.join(backendRoot, "tests", "fixture.mjs")));
const fixture = await createFixture();
for (let index = 1; index <= 8; index += 1) {
  await fixture.client.product.create({ data: { name: `Browser audit burger ${index}`, description: "Disposable local motion fixture", price: 580000 + index, stock: 10, category: "burgers", isActive: true } });
}
const { default: app } = await import(pathToFileURL(path.join(backendRoot, "src", "app.js")));
const server = app.listen(5000, "::1");
await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
console.log("Interactive audit fixture ready on localhost:5000; only disposable test schema is used.");

let closing = false;
async function cleanup() {
  if (closing) return;
  closing = true;
  server.close(async () => { await fixture.cleanup(); process.exit(0); });
}
process.once("SIGINT", cleanup);
process.once("SIGTERM", cleanup);
