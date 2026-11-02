const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

export function formatPercent(pct: number): string {
  return `${Math.round(pct)}%`;
}

export function formatClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "in 2h 14m" under 24h, otherwise "Sat 19:00" (local time). */
export function formatReset(resetsAt: Date, now: number): string {
  const ms = resetsAt.getTime() - now;
  if (ms <= 0) return "resetting now";
  if (ms < 24 * 3600_000) {
    const totalMin = Math.max(1, Math.ceil(ms / 60_000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `in ${m}m`;
    return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`;
  }
  return `${DAYS[resetsAt.getDay()]} ${formatClock(resetsAt)}`;
}

/** "just now", "1 min ago", "23 min ago", "2 h ago", "3 d ago". */
export function formatAgo(at: number, now: number): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "Team · Max 5x" from subscriptionType "team" + rateLimitTier "default_claude_max_5x". */
export function formatPlan(subscriptionType?: string, rateLimitTier?: string): string | null {
  const parts: string[] = [];
  if (subscriptionType) parts.push(cap(subscriptionType));
  if (rateLimitTier) {
    const max = /max_(\d+)x/i.exec(rateLimitTier);
    if (max) parts.push(`Max ${max[1]}x`);
    else if (!/^default/i.test(rateLimitTier)) parts.push(rateLimitTier);
  }
  // Avoid "Max · Max 5x"
  if (parts.length === 2 && parts[0] === "Max" && parts[1].startsWith("Max")) parts.shift();
  return parts.length ? parts.join(" · ") : null;
}
