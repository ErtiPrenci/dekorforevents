import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Local-disk storage for Faza 1. Keys look like
// "biznes/<id>/produkte/<uuid>.webp"; swap this module for S3/R2 later.

// The storage folder is only known at runtime; keep the bundler from tracing it.
const ROOT = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR ?? "./storage");
const MAX_BYTES = 15 * 1024 * 1024;

export type Dosja = "produkte" | "frymezim" | "logo";

export class GabimFoto extends Error {}

const LLOJET = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" } as const;
type Ext = keyof typeof LLOJET;

function llojiNgaBajtet(b: Buffer): Ext | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 4).toString("hex") === "89504e47") return "png";
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

// sharp is a native module; it is loaded only when a photo is uploaded, so a
// machine that blocks native files (e.g. Windows Smart App Control) still runs
// the app and falls back to storing the original JPG/PNG/WebP.
async function ngjeshe(buffer: Buffer, gjeresiaMax: number): Promise<Buffer | null> {
  let sharp: (typeof import("sharp"))["default"];
  try {
    sharp = (await import("sharp")).default;
  } catch (e) {
    console.warn("[foto] sharp nuk u ngarkua, ruhet origjinali:", (e as Error).message.split("\n")[0]);
    return null;
  }
  try {
    return await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({ width: gjeresiaMax, height: gjeresiaMax, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new GabimFoto("Fotoja nuk mund të lexohet. Provoni JPG ose PNG.");
  }
}

export async function ruajFoto(
  biznesId: string,
  dosja: Dosja,
  input: File | Buffer,
  gjeresiaMax = 1600,
): Promise<string> {
  let buffer: Buffer;
  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else {
    if (input.size > MAX_BYTES) throw new GabimFoto("Fotoja është më e madhe se 15 MB.");
    if (input.type && !input.type.startsWith("image/")) throw new GabimFoto("Lejohen vetëm foto.");
    buffer = Buffer.from(await input.arrayBuffer());
  }

  const ngjeshur = await ngjeshe(buffer, gjeresiaMax);
  let ext: Ext;
  let teDhenat: Buffer;
  if (ngjeshur) {
    ext = "webp";
    teDhenat = ngjeshur;
  } else {
    const lloji = llojiNgaBajtet(buffer);
    if (!lloji) throw new GabimFoto("Lejohen vetëm foto JPG, PNG ose WebP.");
    if (buffer.length > MAX_BYTES) throw new GabimFoto("Fotoja është më e madhe se 15 MB.");
    ext = lloji;
    teDhenat = buffer;
  }

  const celesi = `biznes/${biznesId}/${dosja}/${randomUUID()}.${ext}`;
  if (neCloud()) {
    const { put } = await import("@vercel/blob");
    await put(celesi, teDhenat, { access: aksesiBlob(), addRandomSuffix: false, contentType: LLOJET[ext] });
    return celesi;
  }
  const skedari = path.join(/* turbopackIgnore: true */ ROOT, celesi);
  await mkdir(path.dirname(skedari), { recursive: true });
  await writeFile(skedari, teDhenat);
  return celesi;
}

// On Vercel there is no persistent disk: with a Blob store connected, photos
// live in Vercel Blob under the same keys. Locally they stay in STORAGE_DIR.
function neCloud() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function aksesiBlob(): "private" | "public" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

function eshteCelesValid(celesi: string) {
  return /^biznes\/[0-9a-f-]{36}\/(produkte|frymezim|logo)\/[0-9a-f-]{36}\.(webp|jpg|png)$/.test(celesi);
}

function rrugaESigurt(celesi: string): string | null {
  if (!eshteCelesValid(celesi)) return null;
  return path.join(/* turbopackIgnore: true */ ROOT, celesi);
}

export async function lexoFoto(celesi: string): Promise<{ teDhenat: Buffer; lloji: string } | null> {
  if (!eshteCelesValid(celesi)) return null;
  const lloji = LLOJET[celesi.split(".").pop() as Ext];
  try {
    if (neCloud()) {
      const { get } = await import("@vercel/blob");
      const r = await get(celesi, { access: aksesiBlob() });
      if (!r) return null;
      return { teDhenat: Buffer.from(await new Response(r.stream).arrayBuffer()), lloji };
    }
    return { teDhenat: await readFile(/* turbopackIgnore: true */ rrugaESigurt(celesi)!), lloji };
  } catch {
    return null;
  }
}

export async function fshiFoto(celesi: string): Promise<void> {
  if (!eshteCelesValid(celesi)) return;
  if (neCloud()) {
    const { del } = await import("@vercel/blob");
    await del(celesi).catch(() => {});
    return;
  }
  await unlink(rrugaESigurt(celesi)!).catch(() => {});
}

export function urlFoto(celesi: string): string {
  return `/api/foto/${celesi}`;
}

/** Customer inspiration photos are private to the business admin. */
export function eshteFotoPrivate(celesi: string): boolean {
  return celesi.split("/")[2] === "frymezim";
}

export function biznesiIFotos(celesi: string): string | null {
  return celesi.split("/")[1] ?? null;
}
