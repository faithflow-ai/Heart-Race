"use client";
import { TopBar } from "@/components/TopBar";
import { TeamProvider, useTeam } from "@/components/TeamContext";

function Shell({ children }: { children: React.ReactNode }) {
  const { team, error } = useTeam();
  return (
    <>
      <TopBar
        who={team ? `${team.user.name} · ${team.firm.name}` : ""}
        links={[
          { href: "/play", label: "Home", exact: true },
          { href: "/play/decide", label: "Decisions" },
          { href: "/play/research", label: "Research" },
          { href: "/play/results", label: "Results" },
          { href: "/play/log", label: "Change log" },
          { href: "/play/help", label: "How it works" },
        ]}
      />
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
