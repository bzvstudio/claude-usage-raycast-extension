export const AMBER = "#F5A524";
export const RED = "#F31260";

export type Arc = { pct: number; color: string };

export type RingOptions = {
  /** dual mode only (weekly) */
  outer?: Arc | null;
  /** session (or weekly in weekly mode). Omit for the error ring. */
  inner?: Arc | null;
  /** "#000000" for a light menu bar, "#FFFFFF" for a dark one */
  fg: string;
  /** stale data → 50% opacity */
  dim?: boolean;
  /** hollow ring with "!" */
  error?: boolean;
};

const SIZE = 36;
const C = SIZE / 2;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Dash length for an arc of `pct` percent on a circle of radius r. null = no arc, "full" = closed circle. */
export function arcLength(pct: number, r: number): number | "full" | null {
  const p = Math.max(0, Math.min(100, pct));
  if (p <= 0) return null;
  if (p >= 99.5) return "full";
  return r3((2 * Math.PI * r * p) / 100);
}

function ringParts(arc: Arc | null | undefined, r: number, w: number, fg: string): string {
  const track = `<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="${fg}" stroke-opacity="0.25" stroke-width="${w}"/>`;
  if (!arc) return track;
  const len = arcLength(arc.pct, r);
  if (len === null) return track;
  if (len === "full") {
    return `${track}<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="${arc.color}" stroke-width="${w}"/>`;
  }
  const circ = r3(2 * Math.PI * r);
  return (
    track +
    `<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="${arc.color}" stroke-width="${w}" ` +
    `stroke-linecap="round" stroke-dasharray="${len} ${circ}" transform="rotate(-90 ${C} ${C})"/>`
  );
}

export function ringSvg(o: RingOptions): string {
  let body: string;
  if (o.error) {
    body =
      ringParts(null, 14, 4, o.fg) +
      `<rect x="16.25" y="9.5" width="3.5" height="11" rx="1.75" fill="${o.fg}"/>` +
      `<circle cx="${C}" cy="25.25" r="2" fill="${o.fg}"/>`;
  } else if (o.outer) {
    body = ringParts(o.outer, 15, 3, o.fg) + ringParts(o.inner, 9, 3, o.fg);
  } else {
    body = ringParts(o.inner, 14, 4, o.fg);
  }
  const opacity = o.dim ? ` opacity="0.5"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"${opacity}>${body}</svg>`;
}

export function svgDataUri(svg: string): string {
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

/** Light/dark pair for Raycast's Image.Source. `color` of an arc may be the token "fg" to follow the appearance. */
export function ringIcon(o: Omit<RingOptions, "fg">): { light: string; dark: string } {
  const withFg = (fg: string): RingOptions => ({
    ...o,
    fg,
    inner: o.inner ? { ...o.inner, color: o.inner.color === "fg" ? fg : o.inner.color } : o.inner,
    outer: o.outer ? { ...o.outer, color: o.outer.color === "fg" ? fg : o.outer.color } : o.outer,
  });
  return {
    light: svgDataUri(ringSvg(withFg("#000000"))),
    dark: svgDataUri(ringSvg(withFg("#FFFFFF"))),
  };
}

/** Arc colour for a utilisation. Returns "fg" below the warning threshold. */
export function colorFor(pct: number, warn: number, crit: number, locked = false): string {
  if (locked || pct >= 100) return RED;
  if (pct > crit) return RED;
  if (pct >= warn) return AMBER;
  return "fg";
}
