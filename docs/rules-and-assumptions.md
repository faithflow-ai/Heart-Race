# Heart Race: Rules and Assumptions (instructor reference)

Last updated Nov 27, 2026 (economics update built, waiting for merge). This is the single place that records how the simulation works and why. Exact numbers come from the code (`src/sim/config.ts` for rules students can see, `src/sim/market.ts` for hidden buyer behavior, `src/sim/engine.ts` for the math).

**Who can see what.** Following Victor's principle, Learn lessons teach the idea and what it means in the sim, never what to do, and exact numbers stay instructor-only. The exceptions are rules Victor chose to publish so students can find them if they look (marked **Students: Start here**). The rest is marked **Instructor only** (hidden numbers) or **Students: on screen** (shown where they make the decision).

**Status tags.** *Now* = how the code worked before Nov 27 and still works. *Built* = Victor approved and it's in the economics update pull request (live once merged).

---

## 1. The company and the money

| Rule | Value | Who sees it | Status |
|---|---|---|---|
| Company capital (engineering, production, capacity, entry fees) | $3,000,000 at the start, plus revenue minus operating costs each round | Students: on screen | Now |
| Marketing budget (promotion and research only) | $500K in Round 1, $500K in Round 2, $1M in Round 3 that teams pace through the Final round | Students: Start here | Now |
| Earned marketing top-up (from Round 2) | $50K + 10% of last round's revenue. Minimum $50K, can't grow more than 50% over last round's top-up, maximum $1.5M | Students: Start here (as a rule), exact numbers instructor only | Now |
| Unspent marketing money | Carries over. Not counted as profit | Students: Start here | Now |
| Briefing wording | Say "$2M to start, then you earn more by selling." Firms typically spend $7M to $11M on marketing over the game | Students: briefing | Built |
| Per-round marketing cap | Promotion plus research in a round can't go over the greater of $500K or 20% of last round's revenue. Shown as "This round's spending limit" | Students: on screen | Built |
| Running out of capital | Capital never goes below zero. If it would, Vibe Electronics HQ lends the difference at 3% interest per round (charged to profit). The loan is repaid automatically from capital above $500K. Shown on the money rail, Review, Results and Top concerns | Students: on screen | Built |
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
| Industry component prices | Fall 2% per round (was 3%) | Students: Start here ("How costs work"), plus one line under the quote | Built |
| Volume milestones | 5% of the starting cost off at 50,000, 150,000 and 300,000 total units made of that product (all rounds and regions), so the lowest is 85%. Replaced the old doubling curve (10% per doubling, down to 60%) | Students: Start here ("How costs work") | Built |
| Buyer price expectations | Stay flat all game. Prices fall only when teams cut them | Instructor only | Now (confirmed) |

**Why.** With the queued settings, late-round gross margins land at about 47% to 51% and operating margins at about 24% to 31%, close to real wearable makers. Today's settings let them reach about 65% and 45%.

## 3. Production and capacity

| Rule | Value | Who sees it | Status |
|---|---|---|---|
| Starting capacity | 70,000 units per round, shared across products and regions | Students: on screen | Now |
| Overtime | Up to 20% more, at 25% higher unit cost | Students: on screen | Now |
| Expansion | $12 per unit of capacity, online the next round. Paid in cash right away, but spread over 4 rounds for the Financial score (amortized) | Students: on screen | Built |
| Fixed capacity cost | $1.50 per unit of capacity per round, used or not | Students: Start here | Now |
| Holding cost | 5% of unit cost per round on unsold stock | Students: on screen | Now |
| Clearance | Stock unsold for 2 rounds is cleared at 50% of unit cost | Students: on screen | Now |
| Forecast gap warning | When production and forecast differ by more than 20% | Students: on screen | Now |
| Stockouts | Half of the buyers you couldn't serve go to rivals. Satisfaction dips. Buyers who switch count in the rival's demand too (shown on Results as "from rivals' stockouts") | Instructor only (the effect shows in results) | Queued Nov 28 (demand count) |
| Cost of goods sold | Capital pays for every unit when it's made. Profit counts a unit's cost only when it's sold or cleared; unsold units sit in inventory at what they cost to make (oldest sold first) | Students: on screen (P&L, Learn box) | Queued Nov 28 |
| Capital warnings | Products, Forecast and production, Review and the checklist warn when capital has run out, when an accepted quote's fee can't be paid (the product won't be developed; HQ's loan doesn't cover engineering fees), when expansion will be skipped, and when production costs more than the capital left | Students: on screen | Queued Nov 28 |

## 4. Markets, regions and channels

| Rule | Value | Who sees it | Status |
|---|---|---|---|
| Segments | 5 groups of buyers. Each has its own size, growth, expected price, price sensitivity, feature wants, channel habits, media habits, the benefits it cares about and the tone it likes | Instructor only (research reveals them in words or rounded numbers) | Now |
| Market size | About 800,000 buyers per round at the start, growing 3% to 6% a round, with seasonal peaks in Round 4 and the Final round | Instructor only (Market potential study) | Now |
| Regions | North America, Europe, Asia-Pacific, Latin America. Price levels 1.1, 1.05, 0.85 and 0.8 | Instructor only (studies) | Now |
| Region entry | Distributor $50K (partners take 5 extra points, slightly less reach), local partner $150K (2 extra points), own subsidiary $400K (no extra cut, most reach) | Students: on screen | Now |
| Region exit | One-time cost of half the entry fee ($25K, $75K, $200K). Ends that region's overhead. Leftover stock is cleared, awareness fades. Re-entry pays the full entry and setup fees again | Students: on screen | Built |
| Channel setup | $10K to $50K per channel per region. Leaving a channel is free | Students: on screen | Now |
| Partner margins | Own website 0% (plus 8% fulfillment), marketplaces 15%, business distributors 20%, carriers 30%, mass and electronics retail 35%, pharmacies and specialty stores 40% | Students: on screen | Now |
| Volume discounts (leverage) | 20,000 / 50,000 / 100,000 total units through a channel in a region each cut that partner's margin 2 points (6 at most). Leaving a channel (or the region) and coming back resets it | Instructor only (Channel partner survey hints) | Built |

## 5. How buyers choose (demand model, instructor only)

- Each product gets an attractiveness score in each segment and region: **fit** (how well its components match what the segment wants, squared-plus so fit matters a lot) times **price response** times **awareness** times **ad claims** times **satisfaction**. Buyers split among the products they can reach, and some buy nothing (the "no thanks" option).
- **Price response.** Above the segment's expected price, demand falls off faster for price-sensitive segments. Below it there's a modest lift (at most 60%). Nobody buys above the segment's maximum price.
- **Awareness (pull).** Digital, search and traditional ads build awareness per product, region and segment, with diminishing returns ($250K in a product-region gets half the maximum gain). 65% of awareness carries into the next round. Media reach differs by segment.
- **Trade promotion (push).** Pays partners for displays and staff push, which acts like awareness at the shelf and widens stocking. It lasts only the round it's paid for, with diminishing returns ($100K per channel gets half the maximum). Partners respond differently (mass retail and pharmacies the most, marketplaces and distributors the least, the own website not at all).
  - Built (segment-aware): partners stock less of a brand that gives them no trade support. With no trade money, a partner stocks (1 − 0.5 × its trade response, capped at 1) of its usual reach: mass retail, pharmacies, electronics, specialty and carriers about 50%, marketplaces 65%, business distributors 70%, the own website 100%. $100K of trade per product per region wins back half of the loss. The loss therefore scales with how much the target segment shops through partners. Replaced the old "trade lifts stocking up to 30%" rule.
- **Ad claims.** Up to 3 claims per product. True claims a segment cares about add 6% each. False claims add 3% now but hurt satisfaction.
- **Campaigns and creative.** The campaign tone works better in some segments. Each rubric point above or below 3 on the creative grade moves ad effectiveness 5%.
- **Satisfaction.** 40% fit, 25% price versus what buyers expected, 20% honesty of claims, 15% availability. Half carries over each round.
- **AI rivals.** Always 8 firms. Difficulty runs from 3 in Practice and Round 1 to 7.5 in the Final round (3, 3, 3.5, 4.5, 5.5, 6.5, 7, 7.5; lowered from 4 on Nov 28 because level 4 enters two regions in Round 1 and beat sensible student teams by 25 to 40 points). Rivals design from the true buyer preferences with noise that shrinks as difficulty rises, adjust prices (up 4% after a sellout, down 6% with excess stock) and never buy research.

## 6. Scoring (each round)

| Part | Weight | How it's calculated now | Status |
|---|---|---|---|
| Market | 30% | Share of units sold in the team's named target segments, weighted by segment size, compared with the best firm | Now |
| Customer | 20% | 40% product fit to target segments, 30% awareness in targets, 30% satisfaction, compared with the best firm | Now |
| Financial | 20% | 70% profit before one-time costs (engineering, region entry and exit, channel setup) with expansion amortized over 4 rounds; 30% return on promotion (gross margin per promotion dollar over this round and last, capped at 8x, needs at least $50K of promotion). Each compared with the best firm. A loss scores below 0 on the profit part, down to -100 points (a loss as big as the best firm's profit); queued Nov 28, was "a loss scores 0". (Was: operating profit and one-round return on promotion, scaled worst-to-best) | Built |
| Channel | 20% | Coverage of target buyers in target regions, using the trade support actually given, reduced only when the average partner margin runs above what's normal for the target segments' channels (each segment's channel mix times standard margins, weighted by size). (Was: penalty above a flat 15%) | Built |
| Goals and forecast | 10% | Half forecast accuracy, half closeness to the team's own goals: share by target segment (averaged into one), revenue, margin, awareness, satisfaction. A blank goal scores 0 | Built |

- Targets can change each round. Products still sell in dropped segments and count toward profit, but stop counting toward share. Victor decided this is fine (Nov 27).
- **Grade.** Round weights: practice 0, Rounds 1 and 2 at 10% each, Rounds 3 to 6 at 15% each, Final 20%. The export shows each team's weighted score as a percent of the best student team's, then bands A 90+, B 80+, C 70+, D 60+. AI firms are ranked but never take a band.

- **Research timing** (queued Nov 28): Competitor benchmark, Awareness tracking and Satisfaction survey can be bought from Round 2, since they report on products already on sale. The other paid studies open in Round 1, and the market survey is free in Practice only.

## 7. Testing notes

- After the Nov 27 economics update (simulated class, 8 firms): late-round gross margin about 48-54%, operating margin about 25-34%, Round 1 operating margin about -2% (a realistic launch), leanest firm's capital about $1.7M. Moving all trade money into ads now costs about 5 points of the weighted score (was 1), and putting everything into trade costs about 7. Leaving goals blank now lowers the score.

- No single strategy wins. In testing, pricing 30% low lost money and ranked near last, cutting promotion 90% ranked near last, and doubling promotion added nothing.
- Test method: `npm run balance`, plus one firm playing variations of the AI's own decisions against 7 rivals over 3 market draws.
