"use client";
import { MEDIA, REGIONS, type MediaId, type RegionId } from "@/sim/config";
import type { FirmDecision, ProductSpec } from "@/sim/types";
import { money } from "./client";

/** "Where the promotion money goes": totals by medium, product and region, against the budget. */
export function PromoSummary({ d, products, regions, available }: { d: FirmDecision; products: Pick<ProductSpec, "id" | "name">[]; regions: RegionId[]; available?: number }) {
  const spend = (pid: string, r: RegionId, m: MediaId) => Math.max(0, Number(d.plan[pid]?.[r]?.media?.[m]) || 0);
  const total = products.reduce((a, p) => a + regions.reduce((b, r) => b + MEDIA.reduce((c, m) => c + spend(p.id, r, m.id), 0), 0), 0);
  const byMedium = MEDIA.map((m) => ({ name: m.name, v: products.reduce((a, p) => a + regions.reduce((b, r) => b + spend(p.id, r, m.id), 0), 0) }));
  const byProduct = products.map((p) => ({ name: p.name, v: regions.reduce((b, r) => b + MEDIA.reduce((c, m) => c + spend(p.id, r, m.id), 0), 0) }));
  const byRegion = regions.map((r) => ({ name: REGIONS.find((x) => x.id === r)?.name ?? r, v: products.reduce((a, p) => a + MEDIA.reduce((c, m) => c + spend(p.id, r, m.id), 0), 0) }));
  const share = (v: number) => (total > 0 ? `${Math.round((v / total) * 100)}%` : "–");
  const ads = byMedium.slice(0, 3).reduce((a, x) => a + x.v, 0);
  const trade = byMedium[3].v;
  const Block = ({ title, rows }: { title: string; rows: { name: string; v: number }[] }) => (
    <div>
      <h4 style={{ margin: "0 0 4px" }}>{title}</h4>
      <table>
        <tbody>
          {rows.map((x) => (
            <tr key={x.name}>
              <td>{x.name}</td>
              <td className="num">{money(x.v)}</td>
              <td className="num muted small">{share(x.v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Where the promotion money goes</h3>
      <div className="grid3">
        <Block title="By medium" rows={byMedium} />
        <Block title="By product" rows={byProduct} />
        <Block title="By region" rows={byRegion} />
      </div>
      <p style={{ marginBottom: 0 }}>
        <b>Total promotion: {money(total)}</b> · consumer ads (pull) {share(ads)} · trade promotion (push) {share(trade)}
        {available !== undefined && (
          <>
            {" "}· marketing budget available after research: {money(available)} ·{" "}
            <b style={{ color: available - total < 0 ? "var(--bad)" : undefined }}>{available - total < 0 ? `over budget by ${money(total - available)} (promotion will be scaled down)` : `left unspent: ${money(available - total)} (carries over)`}</b>
          </>
        )}
      </p>
    </div>
  );
}
