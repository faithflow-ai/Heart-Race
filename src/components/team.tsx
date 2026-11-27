/** Team colors a team can pick in Practice. AI rivals stay grey so human teams stand out. */
export const TEAM_COLORS = ["#ff3d57", "#19c39a", "#6c7cf0", "#ffb547", "#2fa8e0", "#b45cd6", "#e8742c"] as const;
export const AI_GREY = "#9aa5b5";

export function teamColor(color: string | null | undefined, slot: number | undefined, isAi: boolean) {
  if (isAi) return AI_GREY;
  if (color && (TEAM_COLORS as readonly string[]).includes(color)) return color;
  return TEAM_COLORS[(slot ?? 0) % TEAM_COLORS.length];
}

export function monogram(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? w[0]?.[1] ?? "")).toUpperCase();
}

export function TeamBadge({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  const dark = color === "#ffb547";
  return (
    <span className="teambadge" style={{ background: color, color: dark ? "#142033" : "#fff", width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {monogram(name)}
    </span>
  );
}
