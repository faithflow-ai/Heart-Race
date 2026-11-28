/** Marketing terms that explain themselves on hover or keyboard focus. Definitions explain, never advise. */
export const GLOSSARY: Record<string, string> = {
  "trade promotion": "Money paid to stores and sellers to display, stock and recommend your brand. It pushes the product toward buyers where they shop.",
  push: "Push: marketing aimed at channel partners so they move your product to buyers (trade promotion, margins).",
  pull: "Pull: marketing aimed at buyers so they ask for your brand (ads, search, social).",
  awareness: "The share of a segment's buyers who know your brand. People rarely buy a brand they haven't heard of.",
  "potential share": "The share of buyers in a segment who wanted your product, including buyers who came over when a rival ran out of stock. The gap to your actual share is sales you left on the table.",
  "positioning map": "A picture of where buyers see each product on two criteria they care about. Positioning is what buyers perceive, not what you intend.",
  "pro forma": "A projected profit and loss built from your own forecast and decisions, before the market responds.",
  margin: "The share of the selling price a channel partner keeps.",
};

export function Term({ t, children }: { t: keyof typeof GLOSSARY | string; children?: React.ReactNode }) {
  const def = GLOSSARY[t.toLowerCase()];
  if (!def) return <>{children ?? t}</>;
  return (
    <span className="term" tabIndex={0} aria-describedby={undefined}>
      {children ?? t}
      <span className="term-tip" role="tooltip">{def}</span>
    </span>
  );
}
