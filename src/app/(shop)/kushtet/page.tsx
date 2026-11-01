import { MarkdownIThjeshte } from "@/components/simple-markdown";
import { kushtetParazgjedhur } from "@/lib/kushtet";
import { merrBiznesinPublik } from "@/lib/tenant";

export const metadata = { title: "Kushtet e rezervimit" };

export default async function Kushtet() {
  const b = await merrBiznesinPublik();
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">Kushtet e rezervimit</h1>
      <p className="mt-2 text-sm text-muted">{b.emri}</p>
      <div className="mt-6">
        <MarkdownIThjeshte tekst={b.kushtet?.trim() || kushtetParazgjedhur(b)} />
      </div>
    </div>
  );
}
