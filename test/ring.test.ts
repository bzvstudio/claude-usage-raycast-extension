import { describe, expect, it } from "vitest";
import { AMBER, arcLength, colorFor, RED, ringIcon, ringSvg } from "../src/lib/ring";

const decode = (uri: string) => Buffer.from(uri.split(",")[1], "base64").toString();

describe("arcLength", () => {
  const C = 2 * Math.PI * 14;
  it("0 → no arc", () => expect(arcLength(0, 14)).toBeNull());
  it("50 → half circumference", () => expect(arcLength(50, 14)).toBeCloseTo(C / 2, 2));
  it("99.6 and 100 → full", () => {
    expect(arcLength(99.6, 14)).toBe("full");
    expect(arcLength(100, 14)).toBe("full");
  });
  it("99.4 → partial", () => expect(arcLength(99.4, 14)).toBeCloseTo(C * 0.994, 2));
  it("clamps", () => {
    expect(arcLength(-5, 14)).toBeNull();
    expect(arcLength(250, 14)).toBe("full");
  });
});

describe("ringSvg", () => {
  it("0% renders only the track", () => {
    const s = ringSvg({ inner: { pct: 0, color: "#000" }, fg: "#000" });
    expect(s.match(/<circle/g)).toHaveLength(1);
  });
  it("partial arc starts at 12 o'clock with round caps", () => {
    const s = ringSvg({ inner: { pct: 40, color: "#000" }, fg: "#000" });
    expect(s).toContain('transform="rotate(-90 18 18)"');
    expect(s).toContain('stroke-linecap="round"');
  });
  it("full ring has no dasharray", () => {
    const s = ringSvg({ inner: { pct: 100, color: RED }, fg: "#000" });
    expect(s).not.toContain("dasharray");
    expect(s).toContain(RED);
  });
  it("dual has two tracks", () => {
    const s = ringSvg({ outer: { pct: 10, color: "#000" }, inner: { pct: 10, color: "#000" }, fg: "#000" });
    expect(s).toContain('r="15"');
    expect(s).toContain('r="9"');
  });
  it("dim and error", () => {
    expect(ringSvg({ inner: { pct: 5, color: "#000" }, fg: "#000", dim: true })).toContain('opacity="0.5"');
    expect(ringSvg({ fg: "#000", error: true })).toContain("<rect");
  });
});

describe("ringIcon", () => {
  it("resolves the fg token per appearance", () => {
    const i = ringIcon({ inner: { pct: 30, color: "fg" } });
    expect(i.light.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(decode(i.light)).toContain('stroke="#000000" stroke-width="4" stroke-linecap');
    expect(decode(i.dark)).toContain('stroke="#FFFFFF" stroke-width="4" stroke-linecap');
  });
});

describe("colorFor", () => {
  it.each([
    [0, "fg"],
    [59.9, "fg"],
    [60, AMBER],
    [85, AMBER],
    [85.1, RED],
    [100, RED],
  ])("%d → %s", (p, c) => expect(colorFor(p, 60, 85)).toBe(c));
  it("locked → red", () => expect(colorFor(3, 60, 85, true)).toBe(RED));
});
