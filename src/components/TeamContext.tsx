"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { FirmDecision } from "@/sim/types";
import { api, setPath } from "./client";

export interface TeamData {
  user: { id: string; name: string; email: string };
  /** true when an instructor is looking at this team's screens (read-only). */
  viewAs: boolean;
  /** true for the read-only showcase guest login (colleagues). */
  guest: boolean;
  /** Guest in the class in progress: edits stay in the browser and are never saved. */
  tryIt: boolean;
  game: { id: string; name: string; status: string; round: number; deadline: string | null; timezone: string };
  firm: { id: string; name: string };
  members: { name: string; email: string }[];
  rivals: { id: string; name: string }[];
  decision: FirmDecision;
  updatedAt: string | null;
  budget: { carried: number; release: number; earned: number; available: number; research: number; promotion: number; remaining: number; futureReleases: number; capital: number; capacity: number };
  committed: { id: string; launchRound: number; retired: boolean; unitCost: number }[];
  regionsEntered: Record<string, string>;
  channelsOpen: Record<string, string[]>;
  inventory: Record<string, Record<string, number>>;
  processed: { round: number; processed_at: string }[];
  research: { round: number; study: string }[];
}

type Op = { path: string; op?: "set" | "push" | "remove"; value?: unknown };

interface Ctx {
  team: TeamData | null;
  error: string;
  save: "saved" | "saving" | "pending" | "error";
  saveError: string;
  lastSaved: Date | null;
  set: (path: string, value: unknown) => void;
  push: (path: string, value: unknown) => void;
  remove: (path: string, id: string) => void;
  reload: () => Promise<void>;
  flush: () => Promise<void>;
}

const TeamCtx = createContext<Ctx | null>(null);
export const useTeam = () => useContext(TeamCtx)!;

function applyLocal(d: FirmDecision, op: Op): FirmDecision {
  if (!op.op || op.op === "set") return setPath(d, op.path, op.value);
  const copy = structuredClone(d) as unknown as Record<string, unknown[]>;
  if (op.op === "push") (copy[op.path] as unknown[]).push(op.value);
  if (op.op === "remove") copy[op.path] = (copy[op.path] as { id: string }[]).filter((x) => x.id !== op.value);
  return copy as unknown as FirmDecision;
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [error, setError] = useState("");
  const [save, setSave] = useState<Ctx["save"]>("saved");
  const [saveError, setSaveError] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const pending = useRef<Op[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const tryIt = useRef(false);

  const reload = useCallback(async () => {
    try {
      const t = await api<TeamData>("/api/team");
      tryIt.current = !!t.tryIt;
      if (pending.current.length) t.decision = pending.current.reduce(applyLocal, t.decision);
      setTeam(t);
      setError("");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("haven't joined")) window.location.href = "/join";
      else if (msg.includes("sign in")) window.location.href = "/login";
      setError(msg);
    }
  }, []);

  const flush = useCallback(async () => {
    if (inFlight.current || !pending.current.length || !team) return;
    inFlight.current = true;
    const ops = pending.current;
    pending.current = [];
    setSave("saving");
    try {
      const r = await api<{ decision: FirmDecision }>("/api/team/decision", { method: "PATCH", body: { round: team.game.round, ops } });
      setTeam((t) => (t ? { ...t, decision: pending.current.reduce(applyLocal, r.decision) } : t));
      setSave(pending.current.length ? "pending" : "saved");
      setSaveError("");
      setLastSaved(new Date());
    } catch (e) {
      setSave("error");
      setSaveError((e as Error).message);
      // Drop the failed ops and resync with the server's copy.
      await reload();
    } finally {
      inFlight.current = false;
      if (pending.current.length) timer.current = setTimeout(() => flush(), 300);
    }
  }, [team, reload]);

  const queue = useCallback(
    (op: Op) => {
      setTeam((t) => (t ? { ...t, decision: applyLocal(t.decision, op) } : t));
      if (tryIt.current) return; // Try-it mode: keep the edit on screen only.
      // Coalesce repeated edits to the same field.
      if (!op.op || op.op === "set") pending.current = pending.current.filter((p) => !(p.path === op.path && (!p.op || p.op === "set")));
      pending.current.push(op);
      setSave("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(), 700);
    },
    [flush],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  // Pick up teammates' edits every 20 seconds while idle.
  useEffect(() => {
    const id = setInterval(() => {
      if (!pending.current.length && !inFlight.current && !tryIt.current) reload();
    }, 20_000);
    return () => clearInterval(id);
  }, [reload]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (pending.current.length) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [flush]);

  const value: Ctx = {
    team,
    error,
    save,
    saveError,
    lastSaved,
    set: (path, value) => queue({ path, op: "set", value }),
    push: (path, value) => queue({ path, op: "push", value }),
    remove: (path, id) => queue({ path, op: "remove", value: id }),
    reload,
    flush,
  };
  return <TeamCtx.Provider value={value}>{children}</TeamCtx.Provider>;
}

export function SaveState() {
  const { save, saveError, lastSaved } = useTeam();
  if (save === "error") return <span className="savestate" style={{ color: "var(--bad)" }}>Not saved: {saveError}</span>;
  if (save === "saving" || save === "pending") return <span className="savestate">Saving…</span>;
  return <span className="savestate">{lastSaved ? `All changes saved ${lastSaved.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "All changes saved"}</span>;
}
