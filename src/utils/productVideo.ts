export type ProductVideo =
  | { kind: "file"; src: string; mimeType: string }
  | { kind: "embed"; src: string };

const directVideoTypes: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function aparatId(url: URL): string | null {
  if (!["aparat.com", "www.aparat.com"].includes(url.hostname.toLowerCase())) return null;
  return url.pathname.match(/^\/v\/([A-Za-z0-9_-]{5,40})\/?$/)?.[1]
    ?? url.pathname.match(/^\/video\/video\/embed\/videohash\/([A-Za-z0-9_-]{5,40})(?:\/vt\/frame)?\/?$/)?.[1]
    ?? null;
}

export function normalizeProductVideoUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return "";
  const url = safeUrl(value);
  if (!url) return null;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname.includes("youtube") || hostname.includes("youtu.be")) return null;
  if ([".mp4", ".webm"].some((extension) => url.pathname.toLowerCase().endsWith(extension))) return url.href;
  const aparat = aparatId(url);
  if (aparat) return `https://www.aparat.com/video/video/embed/videohash/${aparat}/vt/frame`;
  return null;
}

export function productVideoKind(value: string | null | undefined): ProductVideo | null {
  const normalized = normalizeProductVideoUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  const extension = Object.keys(directVideoTypes).find((suffix) => url.pathname.toLowerCase().endsWith(suffix));
  return extension ? { kind: "file", src: normalized, mimeType: directVideoTypes[extension] } : { kind: "embed", src: normalized };
}
