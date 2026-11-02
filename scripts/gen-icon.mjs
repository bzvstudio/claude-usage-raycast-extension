// Generates assets/extension-icon.png (512×512). Run: node scripts/gen-icon.mjs
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const r = 150, c = 2 * Math.PI * r, pct = 0.68;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A2420"/><stop offset="1" stop-color="#151210"/></linearGradient></defs>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#g)"/>
  <circle cx="256" cy="256" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="56"/>
  <circle cx="256" cy="256" r="${r}" fill="none" stroke="#D97757" stroke-width="56" stroke-linecap="round"
    stroke-dasharray="${c * pct} ${c}" transform="rotate(-90 256 256)"/>
  <circle cx="256" cy="256" r="34" fill="#D97757"/>
</svg>`;
writeFileSync(new URL("../assets/extension-icon.png", import.meta.url), new Resvg(svg).render().asPng());
console.log("wrote assets/extension-icon.png");
