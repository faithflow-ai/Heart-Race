/**
 * Market event names and default rounds (safe to use in the browser: no hidden numbers).
 * The effects and their sizes live in events.ts, which only runs on the server.
 */
export type EventId = "chip" | "rival" | "tariff";
export const EVENT_IDS: EventId[] = ["chip", "rival", "tariff"];

export const EVENT_META: Record<EventId, { name: string; defaultRound: number }> = {
  chip: { name: "Chip shortage", defaultRound: 4 },
  rival: { name: "New rival launch", defaultRound: 5 },
  tariff: { name: "Tariff on imported parts", defaultRound: 6 },
};

export type EventSchedule = Record<EventId, number | null>;

/** Start round of each event (null = off), from the class settings. */
export function eventSchedule(settings?: { events?: Partial<EventSchedule> } | null): EventSchedule {
  const s = settings?.events ?? {};
  const pick = (id: EventId) => (s[id] === undefined ? EVENT_META[id].defaultRound : s[id]!);
  return { chip: pick("chip"), rival: pick("rival"), tariff: pick("tariff") };
}
