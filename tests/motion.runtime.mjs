import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = path.resolve(websiteRoot, "..", "dashboard", "backend");
const { createFixture } = await import(pathToFileURL(path.join(backendRoot, "tests", "fixture.mjs")));
const fixture = await createFixture();
const product = await fixture.client.product.create({ data: { name: "Audit motion cheeseburger", description: "Runtime motion audit item", price: 580000, stock: 10, category: "burgers", isActive: true } });
const { default: app } = await import(pathToFileURL(path.join(backendRoot, "src", "app.js")));
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const apiUrl = `http://127.0.0.1:${server.address().port}`;
try {
  const menuResponse = await fetch(`${apiUrl}/api/public/menu`);
  const menu = await menuResponse.json();
  if (!menuResponse.ok || !menu.items?.some((item) => item.productId === product.id)) throw new Error(`Local motion fixture API did not return its seeded product (${menuResponse.status})`);
  const result = spawnSync(process.execPath, [path.join(websiteRoot, "tests", "motion.e2e.mjs")], {
    cwd: websiteRoot,
    env: { ...process.env, MOTION_TEST_API: apiUrl },
    stdio: "inherit",
    timeout: 180_000,
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
  await fixture.cleanup();
}
