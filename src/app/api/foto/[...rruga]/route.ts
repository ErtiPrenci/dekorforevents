import { merrAdminin } from "@/lib/auth";
import { biznesiIFotos, eshteFotoPrivate, lexoFoto } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ rruga: string[] }> }) {
  const celesi = (await params).rruga.join("/");

  // Customers' inspiration photos are only visible to that business's admins.
  if (eshteFotoPrivate(celesi)) {
    const admin = await merrAdminin();
    if (!admin || admin.biznesId !== biznesiIFotos(celesi)) return new Response("Not found", { status: 404 });
  }

  const foto = await lexoFoto(celesi);
  if (!foto) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(foto.teDhenat), {
    headers: {
      "Content-Type": foto.lloji,
      "Cache-Control": eshteFotoPrivate(celesi) ? "private, max-age=3600" : "public, max-age=31536000, immutable",
    },
  });
}
