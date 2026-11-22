/** Deadline helpers: "every Sunday at 23:59 in America/Los_Angeles". */

function partsIn(tz: string, d: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second, wd };
}

/** UTC instant for a wall-clock time in a time zone. */
export function zonedToUtc(tz: string, y: number, m: number, d: number, h: number, mi: number): Date {
  let guess = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = partsIn(tz, new Date(guess));
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
    guess += Date.UTC(y, m - 1, d, h, mi) - asUtc;
  }
  return new Date(guess);
}

/** The next weekly deadline strictly after `after`. */
export function nextDeadline(after: Date, weekday: number, time: string, tz: string): Date {
  const [h, mi] = time.split(":").map(Number);
  const local = partsIn(tz, after);
  for (let add = 0; add <= 8; add++) {
    const base = new Date(Date.UTC(local.y, local.m - 1, local.d + add));
    if (base.getUTCDay() !== weekday) continue;
    const cand = zonedToUtc(tz, base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), h, mi);
    if (cand.getTime() > after.getTime() + 60_000) return cand;
  }
  return new Date(after.getTime() + 7 * 864e5);
}

export function formatInZone(d: Date | string | null, tz: string): string {
  if (!d) return "not set";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(d));
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
