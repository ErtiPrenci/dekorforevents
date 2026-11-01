// Renders the tiny subset used for reservation terms: "## heading", "- item", paragraphs.
export function MarkdownIThjeshte({ tekst }: { tekst: string }) {
  const blloqet: React.ReactNode[] = [];
  let lista: string[] = [];
  const mbyllListen = () => {
    if (lista.length) {
      blloqet.push(
        <ul key={blloqet.length} className="list-disc space-y-1 pl-5">
          {lista.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>,
      );
      lista = [];
    }
  };
  for (const rresht of tekst.split(/\r?\n/)) {
    const r = rresht.trim();
    if (r.startsWith("- ")) {
      lista.push(r.slice(2));
      continue;
    }
    mbyllListen();
    if (r.startsWith("## ")) {
      blloqet.push(
        <h2 key={blloqet.length} className="pt-4 text-xl font-semibold text-ink">
          {r.slice(3)}
        </h2>,
      );
    } else if (r) {
      blloqet.push(<p key={blloqet.length}>{r}</p>);
    }
  }
  mbyllListen();
  return <div className="space-y-3 text-ink-soft">{blloqet}</div>;
}
