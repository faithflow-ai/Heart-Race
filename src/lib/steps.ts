/** Which decision step a change-log path belongs to (for "Last edited by" on each step). */
export function stepOfPath(path: string): string | null {
  const [head, second, , field] = path.split(".");
  // "Looks right, keep it" on a carried-forward step.
  if (head === "reviewed") return second ?? null;
  if (head === "strategy" || head === "goals") return "strategy";
  if (head === "products") return path.includes(".campaign") ? "pricing" : "products";
  if (head === "regions") return "markets";
  if (head === "plan") return field === "forecast" || field === "production" ? "production" : "pricing";
  if (head === "mediaMix") return "pricing";
  if (head === "capacityExpansion") return "production";
  if (head === "reflection" || head === "ready") return "review";
  return null;
}
