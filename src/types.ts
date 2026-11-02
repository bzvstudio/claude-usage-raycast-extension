/** One rate-limit window as returned by the usage endpoint (normalised). */
export type UsageWindow = {
  /** Percentage 0–100 (may be fractional). */
  utilization: number;
  /** ISO timestamp of the next reset, or null if unknown. Kept as a string so it serialises cleanly. */
  resetsAt: string | null;
  lockedReason: string | null;
};

export type Usage = {
  fiveHour: UsageWindow | null;
  sevenDay: UsageWindow | null;
  sevenDayOpus: UsageWindow | null;
  sevenDaySonnet: UsageWindow | null;
  /** epoch ms of the successful fetch */
  fetchedAt: number;
};

export type PlanInfo = { subscriptionType?: string; rateLimitTier?: string };

export type ErrorKind =
  // credentials
  | "not_found"
  | "denied"
  | "malformed"
  | "expired"
  // network / API
  | "unauthorized"
  | "rate_limited"
  | "server"
  | "network"
  | "schema";

export type Snapshot = {
  /** Last SUCCESSFUL fetch. Never contains credentials. */
  usage: Usage | null;
  lastError: { kind: ErrorKind; at: number } | null;
  /** epoch ms; background runs skip fetching until then */
  backoffUntil: number | null;
  /** consecutive transient failures, drives exponential backoff */
  failures: number;
  /** epoch ms of the last fetch attempt (success or failure) */
  lastAttemptAt: number | null;
  plan?: PlanInfo;
};

export const EMPTY_SNAPSHOT: Snapshot = {
  usage: null,
  lastError: null,
  backoffUntil: null,
  failures: 0,
  lastAttemptAt: null,
};

export type RingMode = "session" | "weekly" | "dual";

export type Prefs = {
  ringMode: RingMode;
  showPercentText: boolean;
  warnThreshold: string;
  critThreshold: string;
  credentialsSource: "keychain" | "file";
};
