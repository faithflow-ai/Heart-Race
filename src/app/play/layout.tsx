"use client";
import { TopBar } from "@/components/TopBar";
import { api } from "@/components/client";
import { TeamProvider, useTeam } from "@/components/TeamContext";
import { AboutScreen } from "@/components/AboutScreen";
import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { RoundTracker } from "@/components/RoundTracker";
import { START_STEPS } from "@/sim/start";
import { startStepsDone } from "@/components/start";
import { PasteWatch } from "@/components/PasteWatch";

function Shell({ children }: { children: React.ReactNode }) {
  const { team, error } = useTeam();
  const path = usePathname();
  const ob = team?.onboarding;
  const startDone = ob ? startStepsDone(ob, team!).length : START_STEPS.length;
  const startLeft = START_STEPS.length - startDone;
  // First stop: students who haven't finished Start here land there instead of Home.
  useEffect(() => {
    if (!team || !ob || startLeft === 0 || path !== "/play") return;
    let skip = false;
    try {
      skip = sessionStorage.getItem("hr_skip_start") === "1";
    } catch {}
    if (!skip) window.location.replace("/play/start");
  }, [team, ob, startLeft, path]);
  return (
    <>
      <TopBar
        home="/play"
        who={team ? (team.viewAs ? `Instructor viewing ${team.firm.name}` : `${team.user.name} · ${team.firm.name}`) : ""}
        links={[
          { href: "/play/start", label: "Start here", highlight: startLeft > 0, badge: startLeft > 0 ? `${startDone}/${START_STEPS.length}` : undefined },
          { href: "/play", label: "Home", exact: true },
          { href: "/play/decide", label: "Decisions" },
          { href: "/play/results", label: "Results" },
          { href: "/play/research", label: "Research" },
          { href: "/play/learn", label: "Learn" },
          { href: "/play/creative", label: "Creative" },
        ]}
        more={[
          { href: "/play/history", label: "Past decisions", hint: "by round" },
          { href: "/play/log", label: "Change log", hint: "who changed what" },
        ]}
      />
      {team && <RoundTracker team={team} />}
      {team && <PasteWatch off={!!team.viewAs} />}
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
