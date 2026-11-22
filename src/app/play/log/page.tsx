"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/client";
import { ROUNDS } from "@/sim/config";

interface Entry { round: number; at: string; path: string; old_value: unknown; new_value: unknown; name: string }

const show = (v: unknown) => {
  if (v === null || v === undefined) return "–";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
};
const label = (p: string) => p.replace(/\.#[a-z0-9]+/gi, "").replace(/\./g, " › ");

export default function LogPage() {
  const [log, setLog] = useState<Entry[] | null>(null);
  useEffect(() => {
    api("/api/team/log").then((r) => setLog(r.log));
  }, []);
  return (
    <>
      <h1>Change log</h1>
      <p className="muted">Every edit your team made, newest first. Quick edits to the same field are grouped.</p>
      <div className="panel">
        {!log && <p className="muted">Loading…</p>}
        {log && !log.length && <p className="muted">No changes yet.</p>}
        {log && log.length > 0 && (
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Round</th><th>Field</th><th>From</th><th>To</th></tr></thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={i}>
                  <td className="small">{new Date(e.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td>{e.name}</td>
                  <td>{ROUNDS.names[Number(e.round)]}</td>
                  <td>{label(e.path)}</td>
                  <td className="small muted">{show(e.old_value)}</td>
                  <td className="small">{show(e.new_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
