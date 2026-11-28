# Test steps: cost accounting, capital warnings, research timing, stockout buyers, Round 1 projection

Use the Vercel preview link on the PR, or the live site after merging. The quickest way to see the changes is a fresh **demo class** (Your classes → Create demo class), since it has Practice, Round 1 and Round 2 already scored on the new rules. Old classes keep their old results until a round is re-run.

## 1. Cost of goods counted when units sell
1. In the demo class, open **View as student** for any team → **Results** → Profit and loss.
2. The line now says **Cost of goods sold** (not "Cost of goods made").
3. Under **Money and capacity**, check the two new lines: **Units made this round (paid from capital)** and **Unsold inventory, at cost**. When a team has leftover stock, units made is bigger than cost of goods sold.
4. On **Decisions → Review and ready**, the pro forma says **Cost of units sold**.

## 2. Losses score below 0
1. On the class screen, find a firm with negative operating profit in Class results.
2. Its **Financial** points can now be below 0 (the lowest is -70, meaning -100 profit points × 70%). A team with no products scores a little below 0 in total.

## 3. Capital warnings
1. Sign in as a demo student. On **Products**, add a product and accept a quote with a large development fee (several advanced parts) until the fee is more than the team's capital. Also try setting production far above capacity on **Forecast and production**.
2. A red **Company capital warning** box appears on Products, Forecast and production and Review, and the step list shows "to check".
3. A team that owes HQ money sees "You still owe HQ $…" on Review.

## 4. Research timing
1. In a class still in Practice or Round 1, open **Research**.
2. **Competitor benchmark**, **Awareness tracking** and **Satisfaction survey** show **Available from Round 2** with no Buy button.
3. The other paid studies can still be bought in Round 1.

## 5. Buyers from rivals' stockouts
1. On **Results → Supply**, "Sold" is never bigger than "Demand".
2. When buyers came over from a rival that ran out, the Demand cell shows "incl. N from rivals' stockouts", with a note under the table.

## 6. Round 1 market projection
1. In Round 1, on **Review and ready**, click **Run projection**.
2. The text says each rival is filled in with a typical launch plan, and that the two estimates will differ. The projection should no longer look like an empty market.

## 7. Production cost on the Forecast and production screen
1. In Round 1 or later, open **Forecast and production**.
2. Under the capacity bar, a line shows **Cost of making these units** and the capital left for production after this round's fees.
3. Raise production until the cost is more than that capital: the red **Company capital warning** appears at the top.

## 8. Research budget
1. In Round 1, plan promotion on **Price and promotion** until almost all of the marketing budget is used.
2. Open **Research**. "Marketing budget left this round, after planned promotion" matches the number on Home.
3. Studies that cost more than what's left show a greyed-out Buy button and a note to lower planned promotion first.

## 9. Carried-forward steps and leftover stock
1. In the demo class, open **View as student** for a team (or sign in as a demo student) in Round 2 or later.
2. On **Decisions**, steps nobody has changed this round show an amber ↻ and "Carried forward, review it", not a green ✓. Home's "Due this round" list says the same.
3. Open one of those steps. An amber box says the choices were carried forward, with a **Looks right, keep it** button. Click it (as a student): the step turns ✓. Changing anything on the step does the same.
4. In a class in Round 1 where a team has no product ready to sell, **Price and promotion** and **Forecast and production** show "Waiting on Products" instead of ✓.
5. On **Forecast and production**, each row has a line "Units available to sell = in stock now + production". Set production so stock plus production is 1.5 times the forecast or more: a warning appears on the row ("You have N units in stock now and plan to make N more…") and in the step list.

## 10. No raw codes
1. On **Strategy and goals**, change the team color. On **More → Change log**, the entry says "changed the team color".
2. A team whose ad claims overstate a product sees the claim names in its Results concerns (for example "GPS and training accuracy"), not short codes.

## 11. Class screen refreshes after scoring
1. As the instructor, on a class screen, click **Close and score [round] now**.
2. Class results update right away, without reloading the page.

## 12. Students can't switch teams
1. Sign in as a student who has joined a team. Go to the Join page and enter the class code.
2. It says "You're already on [team]… ask your instructor to move you", with no Join buttons for other teams.
3. As the instructor, moving a student on the class screen still works.

## 13. Start here shows the class's scoring weights
1. As the instructor, change the scorecard weights under **Market rules** and save.
2. As a student, open **Start here → Scoring**. The percentages match your new weights.

## 14. The server checks the screens' rules
Nothing to see on screen. The tests (`npm test`) check that edits sent outside the screens are refused: goals in Practice, markets before Round 1, parts the screen doesn't offer, sending a brief whose design breaks the rules (for example a color display with the Basic chip), a new product sent in as already accepted, and negative numbers.

## 15. Autosave keeps the other changes
Hard to trigger by hand: two teammates on the same product, one accepts the quote while the other changes a part. The second person's other edits still save, and the save message names the change that didn't save and why.
