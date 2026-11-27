# Heart Race: Rules and Assumptions (instructor reference)

Last updated Nov 27, 2026. This is the single place that records how the simulation works and why. Exact numbers come from the code (`src/sim/config.ts` for rules students can see, `src/sim/market.ts` for hidden buyer behavior, `src/sim/engine.ts` for the math).

**Who can see what.** Following Victor's principle, Learn lessons teach the idea and what it means in the sim, never what to do, and exact numbers stay instructor-only. The exceptions are rules Victor chose to publish so students can find them if they look (marked **Students: Start here**). The rest is marked **Instructor only** (hidden numbers) or **Students: on screen** (shown where they make the decision).

**Status tags.** *Now* = how the code works today. *Queued* = Victor approved, waiting for his go to build (see the change log). *Proposed* = recommended, waiting for Victor's decision.

---

## 1. The company and the money

| Rule | Value | Who sees it | Status |
|---|---|---|---|
| Company capital (engineering, production, capacity, entry fees) | $3,000,000 at the start, plus revenue minus operating costs each round | Students: on screen | Now |
| Marketing budget (promotion and research only) | $500K in Round 1, $500K in Round 2, $1M in Round 3 that teams pace through the Final round | Students: Start here | Now |
| Earned marketing top-up (from Round 2) | $50K + 10% of last round's revenue. Minimum $50K, can't grow more than 50% over last round's top-up, maximum $1.5M | Students: Start here (as a rule), exact numbers instructor only | Now |
| Unspent marketing money | Carries over. Not counted as profit | Students: Start here | Now |
| Briefing wording | Say "$2M to start, then you earn more by selling." Firms typically spend $7M to $11M on marketing over the game | Students: briefing | Queued |
| Per-round marketing cap | Promotion plus research in a round can't go over the greater of $500K or 20% of last round's revenue. Shown as "This round's spending limit" | Students: on screen | Queued (numbers proposed) |
| Running out of capital | Today production isn't checked against cash, so capital can go below zero. Proposed: HQ advances an emergency loan at about 3% interest per round, with a warning | Students: on screen | Proposed |
| Burn-rate warning | Shown from Round 3 if the marketing pot will run out before the Final round at the current pace | Students: on screen | Now |
| Overhead | $150K per round, plus $40K per region entered | Students: Start here | Now |

**Why.** A new division of an electronics company launching 2 products. Round 1 is the tightest round (in testing the leanest firm got down to about $2.2M). Marketing runs about 9% to 17% of revenue, in line with real wearable brands (about 10% to 20%).

## 2. Products and costs

| Rule | Value | Who sees it | Status |
|---|---|---|---|
| Components and their unit costs | Chip, form factor, battery, display, materials, water resistance, privacy, sensors (see config). Assembly, packaging and app add $10 a unit | Students: on screen (quote) | Now |
| Development fee | $200K per product + $50K per advanced part. 1.5 times as much from Round 4 on | Students: on screen (quote) | Now |
| Lead time | 1 round. Products briefed in the practice round sell in Round 1 | Students: on screen | Now |
| Products | 2 at launch, a 3rd from the Round 4 window (briefed in Round 3) | Students: Start here | Now |
| Industry component prices | Today: fall 3% per round. Queued: 2% per round | Students: Start here ("How costs work"), plus one line under the quote | Queued |
| Volume (learning) savings | Today: 10% off for each doubling of total units made, down to 60% of the starting cost. Queued: 5% off at 50,000, 150,000 and 300,000 total units made of that product (all rounds and regions), so the lowest is 85% of the starting cost | Students: Start here ("How costs work") | Queued |
| Buyer price expectations | Stay flat all game. Prices fall only when teams cut them | Instructor only | Now (confirmed) |

**Why.** With the queued settings, late-round gross margins land at about 47% to 51% and operating margins at about 24% to 31%, close to real wearable makers. Today's settings let them reach about 65% and 45%.

## 3. Production and capacity

| Rule | Value | Who sees it | Status |
|---|---|---|---|
| Starting capacity | 70,000 units per round, shared across products and regions | Students: on screen | Now |
| Overtime | Up to 20% more, at 25% higher unit cost | Students: on screen | Now |
| Expansion | $12 per unit of capacity, online the next round. Queued: its cost is spread over 4 rounds for scoring (amortized) | Students: on screen | Now / Queued |
| Fixed capacity cost | $1.50 per unit of capacity per round, used or not | Students: Start here | Now |
| Holding cost | 5% of unit cost per round on unsold stock | Students: on screen | Now |
| Clearance | Stock unsold for 2 rounds is cleared at 50% of unit cost | Students: on screen | Now |
| Forecast gap warning | When production and forecast differ by more than 20% | Students: on screen | Now |
| Stockouts | Half of the buyers you couldn't serve go to rivals. Satisfaction dips | Instructor only (the effect shows in results) | Now |

## 4. Markets, regions and channels

| Rule | Value | Who sees it | Status |
|---|---|---|---|
| Segments | 5 groups of buyers. Each has its own size, growth, expected price, price sensitivity, feature wants, channel habits, media habits, the benefits it cares about and the tone it likes | Instructor only (research reveals them in words or rounded numbers) | Now |
| Market size | About 800,000 buyers per round at the start, growing 3% to 6% a round, with seasonal peaks in Round 4 and the Final round | Instructor only (Market potential study) | Now |
| Regions | North America, Europe, Asia-Pacific, Latin America. Price levels 1.1, 1.05, 0.85 and 0.8 | Instructor only (studies) | Now |
| Region entry | Distributor $50K (partners take 5 extra points, slightly less reach), local partner $150K (2 extra points), own subsidiary $400K (no extra cut, most reach) | Students: on screen | Now |
| Region exit | One-time cost of half the entry fee ($25K, $75K, $200K). Ends that region's overhead. Leftover stock is cleared, awareness fades. Re-entry pays the full entry and setup fees again | Students: on screen | Queued |
| Channel setup | $10K to $50K per channel per region. Leaving a channel is free | Students: on screen | Now |
| Partner margins | Own website 0% (plus 8% fulfillment), marketplaces 15%, business distributors 20%, carriers 30%, mass and electronics retail 35%, pharmacies and specialty stores 40% | Students: on screen | Now |
| Volume discounts (leverage) | 20,000 / 50,000 / 100,000 total units through a channel in a region each cut that partner's margin 2 points (6 at most). Queued: leaving a channel and coming back resets it | Instructor only (Channel partner survey hints) | Now / Queued |

## 5. How buyers choose (demand model, instructor only)

- Each product gets an attractiveness score in each segment and region: **fit** (how well its components match what the segment wants, squared-plus so fit matters a lot) times **price response** times **awareness** times **ad claims** times **satisfaction**. Buyers split among the products they can reach, and some buy nothing (the "no thanks" option).
- **Price response.** Above the segment's expected price, demand falls off faster for price-sensitive segments. Below it there's a modest lift (at most 60%). Nobody buys above the segment's maximum price.
- **Awareness (pull).** Digital, search and traditional ads build awareness per product, region and segment, with diminishing returns ($250K in a product-region gets half the maximum gain). 65% of awareness carries into the next round. Media reach differs by segment.
- **Trade promotion (push).** Pays partners for displays and staff push, which acts like awareness at the shelf and widens stocking. It lasts only the round it's paid for, with diminishing returns ($100K per channel gets half the maximum). Partners respond differently (mass retail and pharmacies the most, marketplaces and distributors the least, the own website not at all).
  - Queued (segment-aware): partners stock much less of a brand that gives them no trade support. The cut applies only in partner channels, never on the own website, and scales with how much the target segment shops through partners.
- **Ad claims.** Up to 3 claims per product. True claims a segment cares about add 6% each. False claims add 3% now but hurt satisfaction.
- **Campaigns and creative.** The campaign tone works better in some segments. Each rubric point above or below 3 on the creative grade moves ad effectiveness 5%.
- **Satisfaction.** 40% fit, 25% price versus what buyers expected, 20% honesty of claims, 15% availability. Half carries over each round.
- **AI rivals.** Always 8 firms. Difficulty runs from about 4 early to 7.5 in the Final round. Rivals design from the true buyer preferences with noise that shrinks as difficulty rises, adjust prices (up 4% after a sellout, down 6% with excess stock) and never buy research.

## 6. Scoring (each round)

| Part | Weight | How it's calculated now | Status |
|---|---|---|---|
| Market | 30% | Share of units sold in the team's named target segments, weighted by segment size, compared with the best firm | Now |
| Customer | 20% | 40% product fit to target segments, 30% awareness in targets, 30% satisfaction, compared with the best firm | Now |
| Financial | 20% | 70% operating profit, 30% return on promotion, each scaled so the worst firm gets 0 and the best 100 | Now |
| Financial (queued) | | Profit before one-time costs (development, entry, channel setup). Expansion amortized over 4 rounds. Return on promotion changed so cutting promotion can't game it | Queued |
| Channel | 20% | Coverage of target buyers in target regions, reduced when the average partner margin is above 15% | Now (see Proposed below) |
| Goals and forecast | 10% | Half forecast accuracy, half closeness to the team's own goals (share by target segment, revenue, margin, awareness, satisfaction) | Now |
| Goals (queued) | | A blank goal scores zero | Queued |

- **Proposed: channel score fairness.** The margin penalty hurts teams that rightly use high-margin partners. Older Adults buy 45% of their wearables in pharmacies, which take 40%, so a team targeting them well scores about 25% lower on channel than a team selling online. Proposed: compare margins with what's normal for the team's target segments, or drop the margin penalty.
- **Proposed: financial score scaling.** Worst-to-best scaling gives the lowest firm 0 even when it's profitable, and one runaway firm squashes everyone else. Proposed: compare with the best firm, like the other parts.
- Targets can change each round. Products still sell in dropped segments and count toward profit, but stop counting toward share. Victor decided this is fine (Nov 27).
- **Grade.** Round weights: practice 0, Rounds 1 and 2 at 10% each, Rounds 3 to 6 at 15% each, Final 20%. The export shows each team's weighted score as a percent of the best student team's, then bands A 90+, B 80+, C 70+, D 60+. AI firms are ranked but never take a band.

## 7. Testing notes

- No single strategy wins. In testing, pricing 30% low lost money and ranked near last, cutting promotion 90% ranked near last, and doubling promotion added nothing.
- Test method: `npm run balance`, plus one firm playing variations of the AI's own decisions against 7 rivals over 3 market draws.
