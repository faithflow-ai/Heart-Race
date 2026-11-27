/** Which decision step a change-log path belongs to (for "Last edited by" on each step). */
export function stepOfPath(path: string): string | null {
  const [head, , , field] = path.split(".");
  if (head === "strategy" || head === "goals") return "strategy";
  if (head === "products") return path.includes(".campaign") ? "pricing" : "products";
  if (head === "regions") return "markets";
  if (head === "plan") return field === "forecast" || field === "production" ? "production" : "pricing";
  if (head === "mediaMix") return "pricing";
  if (head === "capacityExpansion") return "production";
  if (head === "reflection" || head === "ready") return "review";
  return null;
}
