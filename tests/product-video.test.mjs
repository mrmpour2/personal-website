import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transform } from "esbuild";

const source = await readFile(new URL("../src/utils/productVideo.ts", import.meta.url), "utf8");
const transformed = await transform(source, { loader: "ts", format: "esm" });
const videoModule = await import(`data:text/javascript;base64,${Buffer.from(transformed.code).toString("base64")}`);

test("direct mp4 and webm files resolve to native video sources", () => {
  assert.deepEqual(videoModule.productVideoKind("https://media.example.test/burger.mp4"), {
    kind: "file",
    src: "https://media.example.test/burger.mp4",
    mimeType: "video/mp4",
  });
  assert.equal(videoModule.productVideoKind("https://media.example.test/burger.webm").mimeType, "video/webm");
});

test("Aparat links normalize to the allowlisted embed URL", () => {
  assert.equal(
    videoModule.normalizeProductVideoUrl("https://aparat.com/v/Abc123"),
    "https://www.aparat.com/video/video/embed/videohash/Abc123/vt/frame",
  );
  assert.equal(videoModule.productVideoKind("https://aparat.com/v/Abc123").kind, "embed");
});

test("non-file pages and non-allowlisted hosts are rejected", () => {
  assert.equal(videoModule.normalizeProductVideoUrl("https://aparat.com/video/page"), null);
  assert.equal(videoModule.normalizeProductVideoUrl("https://aparat.example.test/v/Abc123"), null);
  assert.equal(videoModule.normalizeProductVideoUrl("javascript:alert(1)"), null);
});
