"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/client";
import { ROUNDS } from "@/sim/config";

interface Entry { round: number; at: string; name: string; text: string }

export default function LogPage() {
  const [log, setLog] = useState<Entry[] | null>(null);
  useEffect(() => {
    api("/api/team/log").then((r) => setLog(r.log));
  }, []);
  return (
    <>
      <h1>Change log</h1>
      <p className="muted">Every change your team made, newest first. Quick edits to the same field are grouped into one line. Your instructor can see this log too.</p>
      <div className="panel">
        {!log && <p className="muted">Loading…</p>}
        {log && !log.length && <p className="muted">No changes yet.</p>}
        {log && log.length > 0 && (
          <table>
            <thead><tr><th style={{ width: 150 }}>When</th><th style={{ width: 90 }}>Round</th><th>What happened</th></tr></thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={i}>
                  <td className="small">{new Date(e.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="small">{ROUNDS.names[Number(e.round)]}</td>
                  <td><b>{e.name}</b> {e.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
