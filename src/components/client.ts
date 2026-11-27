"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "content-type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const money = (n: number | null | undefined, compact = false) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  if (compact && Math.abs(n) >= 1e6) return `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1e6).toFixed(2)}M`;
  if (compact && Math.abs(n) >= 1e4) return `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n) / 1e3)}K`;
  return `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString()}`;
};
export const num = (n: number | null | undefined) => (n === null || n === undefined ? "–" : Math.round(n).toLocaleString());
export const pct = (n: number | null | undefined, digits = 0) => (n === null || n === undefined ? "–" : `${(n * 100).toFixed(digits)}%`);

export function fmtTime(d: string | null | undefined, tz?: string) {
  if (!d) return "not set";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(d));
}

/** Short day and time, like "Sun 9:42 PM". */
export function fmtShort(d: string | null | undefined, tz?: string) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(d));
}

/** Countdown like "2 days 4 hrs left". */
export function countdown(d: string | null | undefined) {
  if (!d) return "";
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return "Deadline passed";
  const m = Math.floor(ms / 6e4);
  const days = Math.floor(m / 1440), hrs = Math.floor((m % 1440) / 60), mins = m % 60;
  if (days) return `${days} day${days === 1 ? "" : "s"} ${hrs} hr${hrs === 1 ? "" : "s"} left`;
  if (hrs) return `${hrs} hr${hrs === 1 ? "" : "s"} ${mins} min left`;
  return `${Math.max(1, mins)} min left`;
}

export function timeLeft(d: string | null | undefined) {
  if (!d) return "";
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return "deadline passed";
  const h = Math.floor(ms / 36e5);
  if (h >= 48) return `${Math.floor(h / 24)} days left`;
  if (h >= 1) return `${h} hours left`;
  return `${Math.max(1, Math.floor(ms / 6e4))} minutes left`;
}

/** Set a value at a dot path; "#id" picks an array item by id. Returns a new object. */
export function setPath<T>(doc: T, path: string, value: unknown): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = structuredClone(doc) as any;
  const segs = path.split(".");
  let cur = out;
  for (let i = 0; i < segs.length - 1; i++) {
    const s = segs[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (Array.isArray(cur)) cur = s.startsWith("#") ? cur.find((x: any) => x?.id === s.slice(1)) : cur[Number(s)];
    else {
      if (cur[s] === undefined || cur[s] === null) cur[s] = {};
      cur = cur[s];
    }
    if (cur === undefined) return out;
  }
  const last = segs[segs.length - 1];
  if (Array.isArray(cur) && last.startsWith("#")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const i = cur.findIndex((x: any) => x?.id === last.slice(1));
    if (i >= 0) cur[i] = value;
  } else cur[last] = value;
  return out;
}
