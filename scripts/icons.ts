import sharp from "sharp";

// Generates the admin PWA icons (placeholder brand until the platform is named).
const svg = (madhesia: number) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${madhesia}" height="${madhesia}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#2a2230"/>
  <path d="M28 74V42c0-12 10-20 22-20s22 8 22 20v32" fill="none" stroke="#c7a6e8" stroke-width="7" stroke-linecap="round"/>
  <path d="M38 74V46c0-6 5-11 12-11s12 5 12 11v28" fill="none" stroke="#f6c1cf" stroke-width="7" stroke-linecap="round"/>
</svg>`);

for (const m of [192, 512]) await sharp(svg(m)).png().toFile(`public/icon-${m}.png`);
await sharp(svg(64)).png().toFile("src/app/icon.png");
console.log("Ikonat u krijuan.");
