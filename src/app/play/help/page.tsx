import { ROUNDS, SCORECARD_WEIGHTS, SEGMENTS } from "@/sim/config";
import { FAQ, ROUND_FOCUS } from "@/sim/content";

export default function HelpPage() {
  return (
    <>
      <h1>How Heart Race works</h1>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>The scenario</h2>
        <p>
          Your team runs a new smart health wearables company: rings, bands and watches that track heart rate, sleep, activity and more. You compete with the other teams in your class and with AI rivals, eight firms in all, across North America, Europe, Asia-Pacific and Latin America.
        </p>
        <p>Buyers fall into five segments, each with its own needs, price expectations and favorite places to shop: {SEGMENTS.map((s) => s.name).join(", ")}.</p>
      </div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Rounds and deadlines</h2>
        <p>One round per week. Decisions save as you go and lock at the weekly deadline; results post automatically right after.</p>
        <table>
          <thead><tr><th>Round</th><th>Focus</th><th className="num">Share of sim grade</th></tr></thead>
          <tbody>
            {ROUNDS.names.map((n, i) => (
              <tr key={n}><td>{n}</td><td><b>{ROUND_FOCUS[i].title}.</b> <span className="small">{ROUND_FOCUS[i].text}</span></td><td className="num">{Math.round(ROUNDS.gradeWeights[i] * 100)}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>The scorecard</h2>
        <p>Each measure becomes 0 to 100 points against the best firm that round. Your round score is the weighted sum.</p>
        <table>
          <tbody>
            <tr><td>Market</td><td className="num">{SCORECARD_WEIGHTS.market * 100}%</td><td>Your share of units sold in your declared target segments, weighted by segment size.</td></tr>
            <tr><td>Customer</td><td className="num">{SCORECARD_WEIGHTS.customer * 100}%</td><td>How well your products fit those segments, plus awareness and satisfaction.</td></tr>
            <tr><td>Financial</td><td className="num">{SCORECARD_WEIGHTS.financial * 100}%</td><td>Operating profit after promotion (70%) and return on promotion spending (30%).</td></tr>
            <tr><td>Channel</td><td className="num">{SCORECARD_WEIGHTS.channel * 100}%</td><td>Share of target buyers in your target regions who can find you, minus margin paid above 15%.</td></tr>
            <tr><td>Goal accuracy</td><td className="num">{SCORECARD_WEIGHTS.goals * 100}%</td><td>Half sales-forecast accuracy, half closeness to your own numeric goals.</td></tr>
          </tbody>
        </table>
        <p className="small muted">
          Worked example: points of Market 80, Customer 70, Financial 50, Channel 90, Goals 60 give 0.3×80 + 0.2×70 + 0.2×50 + 0.2×90 + 0.1×60 = 72.
        </p>
      </div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q} style={{ marginBottom: 8 }}>
            <summary><b>{f.q}</b></summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
