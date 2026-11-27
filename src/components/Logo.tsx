/** Heart Race wordmark: a heart-rate line that rises like a sales chart. */
export function Logo({ height = 26, light = true }: { height?: number; light?: boolean }) {
  return (
    <svg viewBox="0 0 150 30" height={height} role="img" aria-label="Heart Race">
      <polyline points="2,19 16,19 20,11 25,27 30,4 35,19 44,19" fill="none" stroke="var(--pulse)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="51" y="22" fill={light ? "#ffffff" : "var(--ink)"} fontFamily="var(--font-display)" fontWeight="700" fontSize="17">heart race</text>
    </svg>
  );
}
