import type { ErrorKind, Prefs, Snapshot, UsageWindow } from "../types";
import { formatAgo, formatClock, formatPercent, formatPlan, formatReset } from "./format";
import { colorFor, ringIcon, type Arc } from "./ring";

export const STALE_MS = 15 * 60_000;

export type IconPair = { light: string; dark: string };

export type Row = { key: string; title: string; subtitle: string; icon: IconPair; tooltip?: string };

export type View = {
  icon: IconPair;
  title: string | undefined;
  tooltip: string;
  banners: string[];
  rows: Row[];
  extraRows: Row[];
  planLabel: string | null;
  updatedLabel: string;
  dim: boolean;
  hasData: boolean;
};

export type Thresholds = { warn: number; crit: number };

export function parseThresholds(prefs: Pick<Prefs, "warnThreshold" | "critThreshold">): Thresholds {
  const num = (s: string, d: number) => {
    const n = Number.parseFloat(String(s ?? "").trim());
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : d;
  };
  let warn = num(prefs.warnThreshold, 60);
  let crit = num(prefs.critThreshold, 85);
  if (crit < warn) [warn, crit] = [crit, warn];
  return { warn, crit };
}

/** A window whose reset time has passed is shown as 0% until the next fetch corrects it. */
export function effectiveWindow(w: UsageWindow | null, now: number): UsageWindow | null {
  if (!w) return null;
  if (w.resetsAt && new Date(w.resetsAt).getTime() <= now) {
    return { utilization: 0, resetsAt: null, lockedReason: null };
  }
  return w;
}

export function errorBanner(kind: ErrorKind, backoffUntil: number | null, source: Prefs["credentialsSource"]): string {
  switch (kind) {
    case "not_found":
      return "Not logged in to Claude Code. Run `claude` and /login.";
    case "denied":
      return source === "keychain"
        ? "Keychain access denied. Re-run and click Always Allow."
        : "Can't read ~/.claude/.credentials.json.";
    case "malformed":
      return "Claude Code credentials are unreadable. Run /login again.";
    case "expired":
    case "unauthorized":
      return "Login expired. Open Claude Code once to refresh it.";
    case "rate_limited":
      return backoffUntil ? `Rate limited, retrying at ${formatClock(new Date(backoffUntil))}` : "Rate limited";
    case "server":
    case "network":
      return "Can't reach Anthropic";
    case "schema":
      return "Usage format changed. Extension needs an update.";
  }
}

function arcFor(w: UsageWindow | null, t: Thresholds): Arc {
  if (!w) return { pct: 0, color: "fg" };
  if (w.lockedReason) return { pct: 100, color: colorFor(100, t.warn, t.crit, true) };
  return { pct: w.utilization, color: colorFor(w.utilization, t.warn, t.crit) };
}

function windowText(w: UsageWindow | null, now: number): string {
  if (!w) return "0%";
  const pct = formatPercent(w.lockedReason ? 100 : w.utilization);
  if (!w.resetsAt) return pct;
  return `${pct}   ·   resets ${formatReset(new Date(w.resetsAt), now)}`;
}

export function deriveView(snap: Snapshot, prefs: Prefs, now: number): View {
  const t = parseThresholds(prefs);
  const u = snap.usage;
  const hasData = !!u;

  const five = u ? effectiveWindow(u.fiveHour, now) : null;
  const week = u ? effectiveWindow(u.sevenDay, now) : null;
  const opus = u ? effectiveWindow(u.sevenDayOpus, now) : null;
  const sonnet = u ? effectiveWindow(u.sevenDaySonnet, now) : null;

  const stale = !!u && now - u.fetchedAt > STALE_MS;
  const dim = hasData && (stale || !!snap.lastError);

  const fiveArc = arcFor(five, t);
  const weekArc = arcFor(week, t);

  // ── menu bar icon ──
  let icon: IconPair;
  if (!hasData && snap.lastError) {
    icon = ringIcon({ error: true });
  } else if (prefs.ringMode === "dual") {
    icon = ringIcon({ outer: weekArc, inner: fiveArc, dim });
  } else {
    icon = ringIcon({ inner: prefs.ringMode === "weekly" ? weekArc : fiveArc, dim });
  }

  const pct = (w: UsageWindow | null) => formatPercent(w ? (w.lockedReason ? 100 : w.utilization) : 0);

  let title: string | undefined;
  if (prefs.showPercentText && hasData) {
    if (prefs.ringMode === "dual") title = `${pct(five)} · ${pct(week)}`;
    else title = prefs.ringMode === "weekly" ? pct(week) : pct(five);
  }

  const tooltip = hasData ? `Claude: 5h ${pct(five)} · week ${pct(week)}` : "Claude usage: no data yet";

  // ── banners ──
  const banners: string[] = [];
  if (snap.lastError) {
    banners.push(`⚠ ${errorBanner(snap.lastError.kind, snap.backoffUntil, prefs.credentialsSource)}`);
  }
  if (stale && u) banners.push(`Data from ${formatAgo(u.fetchedAt, now)}`);
  for (const [label, w] of [
    ["Session", five],
    ["Weekly", week],
  ] as const) {
    if (w?.lockedReason) {
      const when = w.resetsAt ? `, resets ${formatReset(new Date(w.resetsAt), now)}` : "";
      banners.push(`⛔ ${label} limit reached: ${w.lockedReason}${when}`);
    }
  }

  // ── rows ──
  const mini = (arc: Arc): IconPair => ringIcon({ inner: arc });
  const rows: Row[] = [
    { key: "five", title: "Session (5h)", subtitle: windowText(five, now), icon: mini(fiveArc) },
    { key: "week", title: "Weekly", subtitle: windowText(week, now), icon: mini(weekArc) },
  ];
  const extraRows: Row[] = [];
  if (opus)
    extraRows.push({ key: "opus", title: "Opus weekly", subtitle: windowText(opus, now), icon: mini(arcFor(opus, t)) });
  if (sonnet) {
    extraRows.push({
      key: "sonnet",
      title: "Sonnet weekly",
      subtitle: windowText(sonnet, now),
      icon: mini(arcFor(sonnet, t)),
    });
  }

  const plan = formatPlan(snap.plan?.subscriptionType, snap.plan?.rateLimitTier);
  const updatedLabel = u ? `Updated ${formatAgo(u.fetchedAt, now)}` : "Not updated yet";

  return {
    icon,
    title,
    tooltip,
    banners,
    rows,
    extraRows,
    planLabel: plan ? `Plan: ${plan}` : null,
    updatedLabel,
    dim,
    hasData,
  };
}
