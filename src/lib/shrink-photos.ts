// Browser-only. Phone photos are often 3–8 MB; hosting (Vercel) rejects request
// bodies over 4.5 MB. Before a form is sent, every image in it is resized to
// at most 1800 px and re-encoded as JPEG (~200–500 KB). The server still
// validates and compresses again.

const MADHESIA_MAX = 1800;
export const KUFIRI_I_KERKESES = 4_000_000;

async function zvogelo(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.size < 350_000) return f;
  try {
    const bitmap = await createImageBitmap(f, { imageOrientation: "from-image" });
    const shkalla = Math.min(1, MADHESIA_MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * shkalla);
    canvas.height = Math.round(bitmap.height * shkalla);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Formats the browser cannot decode (e.g. HEIC on some browsers) go as they are.
    return f;
  }
}

export async function zvogeloFotot(fd: FormData): Promise<FormData> {
  const e_re = new FormData();
  for (const [celesi, vlera] of fd.entries()) {
    e_re.append(celesi, vlera instanceof File && vlera.size > 0 ? await zvogelo(vlera) : vlera);
  }
  return e_re;
}

export function madhesiaEFotove(fd: FormData): number {
  let s = 0;
  for (const v of fd.values()) if (v instanceof File) s += v.size;
  return s;
}
