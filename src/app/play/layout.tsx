"use client";
import { TopBar } from "@/components/TopBar";
import { api } from "@/components/client";
import { TeamProvider, useTeam } from "@/components/TeamContext";

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
          { href: "/play/results", label: "Results" },
          { href: "/play/history", label: "Past decisions" },
          { href: "/play/log", label: "Change log" },
          { href: "/play/help", label: "How it works" },
        ]}
      />
      {team?.viewAs && (
        <div className="viewas">
          <b>View as student (read-only):</b> you&apos;re seeing {team.firm.name}&apos;s screens in {team.game.name}. Nothing you do here changes their decisions.
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
