# Heart Race

A web marketing-strategy simulation for MKT 475 (Concordia). Student teams run smart health wearables companies and compete with each other and AI rivals across 5 segments and 4 regions. One practice round, six rounds, one final round, one per week.

## What's in this first version

- **Sign-in** with a Concordia email and password, then a class code to join a team.
- **Instructor console** (`/admin`): create a class, set the number of teams (AI rivals fill the market to 8 firms), set the weekly deadline, start the game, run a round early, re-run the last round, set AI level and style, move students, reset passwords, edit scorecard weights and the earned-budget formula, see flagged ad claims, and download CSVs (scores by round, final scores with grade bands, roster, reflections, change log).
- **Team screens** (`/play`): home with the round briefing, six decision screens (strategy and goals, product briefs with live engineering quotes, markets and channels, price and promotion with ad claims, forecast and production, review with budget checks and a projected P&L), research studies, results, change log and a How it works page with the FAQ.
- **Autosave** with a change log. Any teammate can edit until the deadline; whatever is saved then is used. Untouched decisions carry forward and are flagged.
- **Automatic processing.** A round runs as soon as anyone opens the app after the deadline, and a daily scheduled job catches anything left.
- **Engine** (`src/sim`): demand by segment and region, fit, price, awareness with carry-over, channel reach, partner margins with volume leverage, production and capacity with overtime, inventory holding and clearance, two money pots, satisfaction, the five-part scorecard, "what changed and why" drivers and Top Concerns.

Not built yet (planned during the term): market events, peer evaluation (CSV export uses a multiplier of 1), reminder emails, the debrief view, the retention screen (Round 4), Concordia roster import.

## Tuning the numbers

All numbers live in two files:

- `src/sim/config.ts`: what students can see (component costs, channel margins, budgets, rounds, scorecard weights, AI ramp, grade bands).
- `src/sim/market.ts`: hidden buyer preferences and demand settings (students learn these through research).

After changing numbers, run `npm run balance` to watch a simulated season of 8 AI firms, and `npm test` to check nothing broke.

## Running it on your laptop

Needs Node.js 20 or newer.

```
npm install
npm run build
AUTH_SECRET=anything INSTRUCTOR_EMAILS=you@cui.edu npm start
```

Open http://localhost:3000. Without `DATABASE_URL` it uses a built-in database saved in `.data/`.

## Putting it online (Vercel + Supabase, free tiers)

1. Create a free Supabase project. Copy the **Transaction pooler** connection string (Project Settings → Database).
2. Import this GitHub repo into Vercel.
3. In Vercel → Settings → Environment Variables, add `DATABASE_URL`, `AUTH_SECRET` (a long random string), `INSTRUCTOR_EMAILS` and `CRON_SECRET` (see `.env.example`).
4. Deploy. Tables are created automatically on first use (`db/schema.sql`).

Vercel's free plan runs the scheduled job once a day; rounds also process the moment anyone opens the app after the deadline.
