"use client";
import { TopBar } from "@/components/TopBar";
import { api } from "@/components/client";
import { TeamProvider, useTeam } from "@/components/TeamContext";
import { AboutScreen } from "@/components/AboutScreen";
import { Suspense } from "react";

function Shell({ children }: { children: React.ReactNode }) {
  const { team, error } = useTeam();
  return (
    <>
      <TopBar
        who={team ? (team.viewAs ? `Instructor viewing ${team.firm.name}` : `${team.user.name} · ${team.firm.name}`) : ""}
        links={[
          { href: "/play", label: "Home", exact: true },
          { href: "/play/decide", label: "Decisions" },
          { href: "/play/research", label: "Research" },
          { href: "/play/creative", label: "Creative" },
          { href: "/play/results", label: "Results" },
          { href: "/play/history", label: "Past decisions" },
          { href: "/play/learn", label: "Learn" },
          { href: "/play/log", label: "Change log" },
          { href: "/play/help", label: "How it works" },
        ]}
      />
      {team?.tryIt && (
        <div className="viewas" style={{ background: "#e8f5e9", color: "#1b5e20", borderColor: "#b7dfb9" }}>
          <span><b>Try-it mode:</b> type in any field and click through the screens to see what students do. Nothing is saved, no round will run, and your entries clear when you reload the page.</span>
        </div>
      )}
      {team?.viewAs && (
        <div className="viewas">
          <span>
            <b>{team.guest ? `You're viewing ${team.firm.name} as a guest.` : `View as student: ${team.firm.name}.`}</b> {team.tryIt
              ? "The Practice round and Round 1 were entered by this team's students. Round 2 is open for you to try."
              : "Everything on these screens was entered by this team's students. Read-only: nothing you do here changes anything."}
          </span>
          <button
            onClick={async () => {
              await api(`/api/games/${team.game.id}/viewas`, { method: "DELETE" });
              window.location.href = `/admin/${team.game.id}`;
            }}
          >
            Back to class screen
          </button>
        </div>
      )}
      <div className="page">
        {error && !team && <div className="notice bad">{error}</div>}
        {team?.viewAs && <Suspense fallback={null}><AboutScreen team={team} /></Suspense>}
        {team ? children : !error && <p className="muted">Loading…</p>}
      </div>
    </>
  );
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeamProvider>
      <Shell>{children}</Shell>
    </TeamProvider>
  );
}
