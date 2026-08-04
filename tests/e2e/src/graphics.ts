import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

import { PNG } from "pngjs";

import type { GraphicsCommand } from "./term/protocol-seam.ts";

/**
 * Shared test-image asset and pixel analysis for the graphics test tiers.
 *
 * The asset is a real multi-color image with genuine alpha (Chrome's app
 * icon resampled to 64px — regenerate with:
 * `sips -s format png "/Applications/Google Chrome.app/Contents/Resources/app.icns"
 *    --out tests/e2e/data/graphics/test-icon.png --resampleWidth 64`).
 * Real imagery is load-bearing: the assertions require multiple hue
 * clusters (a synthetic solid square can't distinguish a rendered image
 * from a stray fill) and fully transparent regions (blend-through proves
 * alpha survives herdr's re-encode).
 */

const ASSET_PATH = path.resolve(import.meta.dirname, "../data/graphics/test-icon.png");

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface TestImage {
  width: number;
  height: number;
  /** Decoded straight-alpha RGBA (kitty f=32 payload). */
  rgba: Buffer;
  /** The PNG file bytes (kitty f=100 payload). */
  png: Buffer;
  /** Sample points verified fully transparent in the alpha channel. */
  transparentPoints: Array<[number, number]>;
  /** Bounding box of non-transparent pixels (alpha > 10). */
  opaqueBounds: Bounds;
  /** Bounding box of chromatic pixels (see isChromatic). */
  coloredBounds: Bounds;
}

let cachedImage: TestImage | undefined;

/** Load the committed asset, verifying the properties the tests rely on. */
export function loadTestImage(): TestImage {
  if (cachedImage) return cachedImage;
  const png = readFileSync(ASSET_PATH);
  const decoded = PNG.sync.read(png);
  const { width, height, data } = decoded;

  const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3] ?? 0;
  const opaqueBounds = { minX: width, minY: height, maxX: -1, maxY: -1 };
  const coloredBounds = { minX: width, minY: height, maxX: -1, maxY: -1 };
  const grow = (bounds: Bounds, x: number, y: number) => {
    if (x < bounds.minX) bounds.minX = x;
    if (y < bounds.minY) bounds.minY = y;
    if (x > bounds.maxX) bounds.maxX = x;
    if (y > bounds.maxY) bounds.maxY = y;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (alphaAt(x, y) > 10) grow(opaqueBounds, x, y);
      if (isChromatic(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, data[i + 3] ?? 0)) {
        grow(coloredBounds, x, y);
      }
    }
  }

  // Near-corner points, verified transparent rather than assumed (the icon
  // is a circle, so the corners sit inside the placed rect yet are alpha=0).
  const inset = 2;
  const transparentPoints: Array<[number, number]> = [
    [inset, inset],
    [width - 1 - inset, inset],
    [inset, height - 1 - inset],
    [width - 1 - inset, height - 1 - inset],
  ];
  for (const [x, y] of transparentPoints) {
    if (alphaAt(x, y) > 5) {
      throw new Error(
        `test-icon.png: expected (${x},${y}) fully transparent, alpha=${alphaAt(x, y)}`,
      );
    }
  }
  const stats = colorStats(data);
  if (stats.hueClusters < 2) {
    throw new Error(
      `test-icon.png: expected a multi-hue image, found ${stats.hueClusters} hue clusters`,
    );
  }

  cachedImage = {
    width,
    height,
    rgba: Buffer.from(data),
    png,
    transparentPoints,
    opaqueBounds,
    coloredBounds,
  };
  return cachedImage;
}

/** Strongly colored, effectively opaque pixel (channel spread > 40). */
export function isChromatic(r: number, g: number, b: number, a = 255): boolean {
  return a >= 200 && Math.max(r, g, b) - Math.min(r, g, b) > 40;
}

/** Kitty spec caps payload chunks at 4096 base64 chars. */
const CHUNK = 4096;

function chunkedApc(control: string, b64: string): string {
  if (b64.length <= CHUNK) return `\x1b_G${control};${b64}\x1b\\`;
  let out = `\x1b_G${control},m=1;${b64.slice(0, CHUNK)}\x1b\\`;
  let offset = CHUNK;
  while (offset < b64.length) {
    const chunk = b64.slice(offset, offset + CHUNK);
    offset += CHUNK;
    out += `\x1b_Gm=${offset < b64.length ? 1 : 0},q=2;${chunk}\x1b\\`;
  }
  return out;
}

/** Transmit+display of the image as raw RGBA (f=32), chunked, responses off. */
export function kittyTransmitRgba(image: TestImage, imageId = 777): string {
  const control = `a=T,t=d,f=32,s=${image.width},v=${image.height},i=${imageId},q=2`;
  return chunkedApc(control, image.rgba.toString("base64"));
}

/** Transmit+display of the image as PNG bytes (f=100), chunked, responses off. */
export function kittyTransmitPng(image: TestImage, imageId = 777): string {
  const control = `a=T,t=d,f=100,i=${imageId},q=2`;
  return chunkedApc(control, image.png.toString("base64"));
}

export interface RegionStats {
  /** Pixels with strong chroma (max-min channel spread > 40). */
  colored: number;
  /** 30-degree hue bins holding >5% of the colored pixels. */
  hueClusters: number;
  total: number;
}

/**
 * Chroma/hue statistics over an RGBA pixel array. Channel-spread + hue-bin
 * clustering stays robust across compositors and color management, where
 * exact channel values drift.
 */
export function colorStats(rgba: ArrayLike<number>): RegionStats {
  const bins = new Array<number>(12).fill(0);
  let colored = 0;
  const total = Math.floor(rgba.length / 4);
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const r = rgba[i] ?? 0;
    const g = rgba[i + 1] ?? 0;
    const b = rgba[i + 2] ?? 0;
    const a = rgba[i + 3] ?? 0;
    if (!isChromatic(r, g, b, a)) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    colored++;
    let hue: number;
    if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
    const bin = bins[Math.floor(hue * 2) % 12];
    bins[Math.floor(hue * 2) % 12] = (bin ?? 0) + 1;
  }
  const hueClusters = bins.filter((count) => count > colored * 0.05).length;
  return { colored, hueClusters, total };
}

/** Map a point through the affine correspondence of two bounding boxes. */
export function mapPoint(from: Bounds, to: Bounds, point: [number, number]): [number, number] {
  const [x, y] = point;
  const sx = (to.maxX - to.minX) / Math.max(1, from.maxX - from.minX);
  const sy = (to.maxY - to.minY) / Math.max(1, from.maxY - from.minY);
  return [Math.round(to.minX + (x - from.minX) * sx), Math.round(to.minY + (y - from.minY) * sy)];
}

export interface ReconstructedImage {
  /** Control keys of the leading transmit. */
  keys: Record<string, string>;
  /** Full payload with chunks concatenated and o=z inflated. */
  data: Buffer;
  /** Payload re-encoded as a PNG (pass-through for f=100). */
  png: Buffer;
  width: number;
  height: number;
  /** Straight-alpha RGBA regardless of transmitted format. */
  rgba: Buffer;
}

/**
 * Rebuild the image from a seam-captured transmission: concatenate the
 * chunked payload (m=1 continuations), inflate o=z, and interpret per the
 * transmitted format (f=32 raw RGBA or f=100 PNG).
 */
export function reconstructTransmission(
  records: readonly GraphicsCommand[],
  startIndex: number,
): ReconstructedImage {
  const first = records[startIndex];
  if (!first) throw new Error(`no graphics record at index ${startIndex}`);
  const parts = [first.payload];
  if (first.keys["m"] === "1") {
    for (let i = startIndex + 1; i < records.length; i++) {
      const record = records[i];
      if (!record) break;
      // Continuation chunks carry only m (and q) keys.
      if (record.keys["a"] !== undefined || record.keys["m"] === undefined) {
        throw new Error("chunked transmission interrupted by a non-continuation record");
      }
      parts.push(record.payload);
      if (record.keys["m"] === "0") break;
    }
  }
  let data = Buffer.concat(parts);
  if (first.keys["o"] === "z") data = zlib.inflateSync(data);

  const format = first.keys["f"] ?? "32";
  if (format === "100") {
    const decoded = PNG.sync.read(data);
    return {
      keys: first.keys,
      data,
      png: data,
      width: decoded.width,
      height: decoded.height,
      rgba: Buffer.from(decoded.data),
    };
  }
  if (format !== "32") throw new Error(`unsupported transmission format f=${format}`);
  const width = Number(first.keys["s"]);
  const height = Number(first.keys["v"]);
  if (!width || !height) throw new Error("f=32 transmission missing s=/v= dimensions");
  const png = new PNG({ width, height });
  data.copy(png.data);
  return { keys: first.keys, data, png: PNG.sync.write(png), width, height, rgba: data };
}

const ARTIFACTS_DIR = path.resolve(import.meta.dirname, "../test-results/graphics");

/** Write a per-run visual artifact under test-results/graphics/. */
export async function writeGraphicsArtifact(
  fileName: string,
  data: Buffer | string,
): Promise<string> {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const filePath = path.join(ARTIFACTS_DIR, fileName);
  await writeFile(filePath, data);
  return filePath;
}
