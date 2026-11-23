import { HttpError, requireInstructor } from "@/lib/auth";
import { getDecision, getFirms, getResult, proFormaFor, settingsOf } from "@/lib/game";
import { normalizeDecision } from "@/sim/product";
import { instructorGame } from "@/lib/access";
import { handle } from "@/lib/http";

/** Instructor view of one firm: its decisions for a round and, if processed, its reports. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const sp = new URL(req.url).searchParams;
  const firm = (await getFirms(g.id)).find((f) => f.id === sp.get("firmId"));
  if (!firm) throw new HttpError(404, "Firm not found.");
  const round = Number(sp.get("round") ?? g.current_round);
  const res = round < g.current_round ? await getResult(g.id, round) : null;
  const decision = res ? res.decisions[firm.id] : firm.is_ai ? null : (await getDecision(firm.id, round)).data;
  const accepted = res ? Object.fromEntries(Object.values(res.state.firms[firm.id]?.products ?? {}).map((p) => [p.spec.id, { briefedRound: p.briefedRound, launchRound: p.launchRound }])) : {};
  const rep = res?.reports[firm.id];
  let proforma = null;
  if (res && rep && decision && round >= 1) {
    const prev = await getResult(g.id, round - 1);
    proforma = proFormaFor(round, normalizeDecision(decision), prev?.state.firms[firm.id], settingsOf(g), rep.budget.start + rep.budget.release + rep.budget.earned);
  }
  return { firm, round, decision, accepted, report: rep ?? null, score: res?.scores[firm.id] ?? null, proforma };
});
