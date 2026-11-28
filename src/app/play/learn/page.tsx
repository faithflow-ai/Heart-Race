"use client";
import { useTeam } from "@/components/TeamContext";
import { Markdown } from "@/components/Markdown";
import { ROUNDS } from "@/sim/config";
import { LESSONS } from "@/sim/lessons";

export default function LearnPage() {
  const { team } = useTeam();
  const t = team!;
  const round = Math.min(t.game.round, ROUNDS.final);
  const notes = !!t.viewAs;
  const rounds = LESSONS.filter((l) => l.round !== null && (l.round <= round || notes));
  const creative = LESSONS.find((l) => l.id === "creative");
  const events = LESSONS.find((l) => l.id === "events");
  const showEvents = !!events && (notes || !!t.eventsSeen);
  const upcoming = LESSONS.filter((l) => l.round !== null && l.round > round).length;
  return (
    <>
      <h1>Learn</h1>
      <p className="muted">
        One lesson for each round: the marketing ideas behind that round&apos;s decisions and what they mean in Heart Race. The lessons explain how things work; deciding what to do is up to your team. This round&apos;s lesson is open below; earlier ones stay here for reference.
        {upcoming > 0 && !notes && ` ${upcoming} more lesson${upcoming === 1 ? "" : "s"} will appear as the game goes on.`}
      </p>
      {notes && <div className="notice info small">You&apos;re viewing as the instructor: all lessons are shown, with instructor notes. Students see only lessons up to the open round, without the notes.</div>}
      {[...rounds].reverse().map((l) => (
        <details key={l.id} open={l.round === round} className="panel">
          <summary><b style={{ fontSize: 18 }}>{l.title}</b>{l.round === round && <span className="badge accent" style={{ marginLeft: 8 }}>This round</span>}</summary>
          <Markdown text={l.body} notes={notes} />
        </details>
      ))}
      {showEvents && events && (
        <details className="panel" open={(t.news ?? []).length > 0}>
          <summary><b style={{ fontSize: 18 }}>{events.title}</b> <span className="small muted">(companion lesson for Market news)</span></summary>
          <Markdown text={events.body} notes={notes} />
        </details>
      )}
      {creative && (
        <details className="panel" open={round === 1 || round === 4 || round === ROUNDS.final}>
          <summary><b style={{ fontSize: 18 }}>{creative.title}</b> <span className="small muted">(companion lesson for the Creative tab)</span></summary>
          <Markdown text={creative.body} notes={notes} />
        </details>
      )}
    </>
  );
}
