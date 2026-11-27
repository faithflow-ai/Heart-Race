# Heart Race: Change Log (screen-by-screen review)

**App:** https://heart-race.vercel.app
**Reviewed by:** Victor Wang, with Claude (read-only walkthrough; no decisions submitted, no test class data changed)
**Started:** November 2026

**Priority key**
- **P1**: must fix (broken, wrong, or blocks students or the instructor)
- **P2**: should fix before the class goes live
- **P3**: nice to have

**Format:** `[Priority] Screen – Area: change`

---

## App-wide

- [P3] App-wide – Look and feel: cosmetic changes to be discussed later (details to come)

## Instructor: Your classes (/admin)

- [P2] Your classes – Header: add a short description under the "Heart Race" name explaining what it is, e.g., "MKT 475 Marketing Capstone Simulation"

## Instructor: Class screen (/admin/<class>)

- [P2] Class screen – Controls: rename "Run Practice now" to something like "Close and score Practice now", add a one-line explanation, and ask for confirmation before it runs
- [P2] Class screen – Controls: add a game start date with a calendar date picker (plus time), so the game starts automatically on that date; keep the "Start game" button as an option to start immediately, and relabel it so it's clear it turns on the deadline clock
- [P2] Class screen – Weekly deadline: keep as is (no change; noted so it isn't altered when the start date is added)
- [P1] Class screen – Results: add a class results dashboard showing all 8 firms side by side (rank, total score, each scorecard measure – market, customer, financial, channel, goals), plus key numbers (revenue, profit, market share, awareness, satisfaction, goals vs. actual), with round-by-round trend and a click-through to each team's detail. Today only "Last score" shows on screen; everything else is only in the CSV export
- [—] Class screen – AI rivals: Victor likes this feature as built (keep)
- [P1] Class screen – Team decisions by round: for each student team, a readable page showing all of the team's inputs round by round (strategy and goals, product briefs, regions and channels, prices, promotion and media mix, forecast and production, research bought, reflection), so the instructor can review what each team decided and give feedback offline. Today past-round inputs only appear as raw data under the team's Details page (added Nov 22)
- [P1] Student – Past decisions: students also need a readable history of their own team's inputs and decisions from previous rounds (e.g. a "Past decisions" tab with a round picker), next to the Results for that round (added Nov 22). Built and live (Nov 22)
- [P1] Class screen – Student teams: add a "View as student" button for each team that opens the team's student screens read-only (instructor can see everything the team sees without logging in as a student and without being able to submit or change decisions)

## Student: Home (/play)

- [P2] Home – This round card: relabel the "Go to decisions" button so it reads as the starting point, e.g., "Start your decisions here" or "Start this round's decision-making here"
- [P2] Home – Marketing budget box: during Practice, replace or explain "$0 of $0 available this round" with a note such as "Marketing budget starts in Round 1" so students don't read it as an error

## Student: App-wide navigation

- [P2] Student menu – New "Learn" tab: add a Learn tab to the top menu with one lesson per round matching that round's focus (e.g., Practice: market research and segmentation; Round 1: targeting, pricing, promotion, channels). This is where the instructor's lecture content lives, written so Victor can also reuse it in class **Built in PR 4 (Nov 23), waiting for merge.**

## Student: How it works (/play/help)

- [P2] How it works – The scenario: expand from two paragraphs to a full, detailed briefing (as detailed as possible, even if not every student reads it). Include: the company's backstory and the wearables opportunity; the student team's role (division leadership with P&L responsibility, marketing focus); where the money comes from ($3M company capital, marketing budget releases, earned budget) and what each pays for; what headquarters expects by the end of the game; the 4 regions and how they differ; the 5 segments with a short profile of each; Good/Better/Best product tiers; the competition (8 firms, AI rivals); and how to get started in Practice. Could use expandable sections so it stays readable **Built in PR 4 (Nov 23), waiting for merge.**

## Student: Decisions (/play/decide)

- [P2] Decisions – Locked tabs: on each locked tab (Markets & channels, Price & promotion, Forecast & production, and any other locked section), show when it opens, e.g., "🔒 Opens in Round 1" (use the actual round number for each)
- [P2] Decisions – Strategy & goals – Mission: add guidance instead of a blank box: a one-line explanation, prompt questions (Who do we serve? What need do we meet? What do we offer that others don't? What do we stand for?), and an optional fill-in template, e.g., "We help [customers] [achieve/solve ___] by [offering ___], unlike [alternatives]"
- [—] Decisions – Strategy & goals – Positioning statement: Victor likes the classic marketing prompts as built (keep)
- [P2] Decisions – Strategy & goals – Team norms: rename to "Team charter" and add guided prompt questions students answer: (1) roles and who owns which decision area; (2) how and how fast we communicate; (3) when we meet; (4) how we make decisions (consensus or vote) and who finalizes before the deadline; (5) how we split the work; (6) what happens if a member isn't doing their share (escalation steps, e.g., direct reminder → team discussion → notify instructor → reflected in peer evaluation); (7) how we resolve disagreements; (8) all members confirm they agree. Link it to the peer evaluation and the existing change log
- [P3] Decisions / How it works – Wording: make the two consistent about when teams pick target segments and regions. Decisions lets teams pick them in Practice, but the How it works rounds table lists it under Round 1. Suggested wording: "Pick your target segments and regions in Practice; you can change them until the Round 1 deadline"
- [P2] Decisions – Products – Engineering quote: show the unit cost breakdown on screen, not hidden: parts (each component's cost) + assembly cost = unit cost (e.g., Product 1: $29 parts + $10 assembly = $39)
- [P2] Decisions – Products – Top of tab: explain the product limit here: "Brief up to 2 products now. A third product can be briefed by Round 3 to launch in Round 4"
- [P3] Decisions – Products – Button: rename "+ New product brief" to "+ Add another product" (drafts already save automatically, so "save" isn't needed)
- [P1] Decisions – Products – Brief and quote process: change to two steps instead of one button. Step 1 "Send brief to engineering" → engineering returns a quote (unit cost with breakdown, development fee, lead time). Step 2 team reviews and either "Accept quote" (with a confirmation pop-up: "This locks the design and charges $X from company capital at the deadline") or "Revise brief". Show a status on each product: Draft → Quote received → Accepted (locked)
- [P2] Decisions – Review & submit – Tab name: rename to "Review & checklist" (or "Review"), since there is no submit button; make clear students should come here to double-check all inputs before the deadline
- [P1] Decisions – Review & submit – Checklist: add an automatic checklist of missing or incomplete decisions for the current round, e.g., "⚠ Company not named · ⚠ Product brief still a draft (not sent to engineering, won't be ready next round) · ⚠ No target segments chosen · ⚠ Round reflection empty", with links to fix each item
- [P3] Decisions – Review & submit – Learn box (Practice): remove the mention of "projected results" during Practice, since there are no prices or sales yet
- [P1] Decisions – Price & promotion – Promotion in dollars: replace the percentage media split with a dollar amount for each medium (Digital & social, Search, Traditional media, Trade promotion) for each product in each region. Totals add up automatically (per product, per region, and for the round, shown against the marketing budget left). Spending less than the full budget is fine; unspent money carries over. Show a clear summary of where the money goes (by medium, product and region) to students and the instructor, including in Past decisions and the instructor's Decisions view. Today: one promotion dollar amount per product per region plus one % split across the 4 media for the whole team (added Nov 23). Victor confirmed the full version on Nov 23: dollars per medium for every product in every region (up to 32 inputs with 2 products in 4 regions), because the capstone should make teams work it out **Built in PR 4 (Nov 23), waiting for merge.**
- [P1] Results – Promotion results report (from Round 1): after each round, show for each product and region the dollars spent in each medium and what it bought. For Digital & social, Search and Traditional media: awareness gained in each segment and cost per awareness point, with the team's target segments highlighted (e.g., "$80K on digital barely moved Older Adults"). For Trade promotion (money paid to retailers, marketplaces and distributors to promote and stock our products, using their bigger footprint): show its return as availability and stocking in each channel, not awareness. Visible to students on Results and to the instructor. The engine already makes media work differently by segment; this report makes that effect visible (added Nov 23) **Built in PR 4 (Nov 23), waiting for merge.**
- [P1] Engine tuning – Trade promotion payoff: make money paid to retailers, marketplaces and distributors (Trade promotion) pay off clearly next to digital ads, especially for mass-market segments (Budget & First-Time Buyers, Everyday Wellness, Older Adults & Caregivers) and in retail-heavy channels. A balanced plan that funds the channel partners should usually beat an all-digital plan for those segments, so students learn that many brands spend more pushing through intermediaries than on direct-to-consumer ads. Check with test runs that no single medium always wins (added Nov 23). Also: each type of channel partner (own website, online marketplaces, mass retail, specialty stores, etc.) responds differently to trade promotion, so some partners push harder per dollar than others. Needed for the revised $30K Channel partner survey in Drafts/3_Research_Study_Outlines.md, which reports these differences **Built in PR 4 (Nov 23), waiting for merge.**
- [P2] Learn / lecture – Push vs. pull marketing: add a short lesson (Round 1 focus) on trade promotion and channel partners as indispensable intermediaries: why brands often spend more with retailers and distributors (slotting, co-op ads, in-store displays, sales incentives) than on consumer ads, and how to read the Promotion results report. The lesson text is being written in Drafts/2_Learn_Tab_Lessons.md (one version only); when building, put that draft into the Learn tab rather than writing a separate one (added Nov 23) **Built in PR 4 (Nov 23), waiting for merge.**
- [P2] Decisions – Review & submit – Projected results (from Round 1): add a projected profit-and-loss (pro forma) built from the team's own decisions: forecast units × price = revenue, minus cost of goods (units × quoted unit cost), promotion, research, engineering and entry fees, holding costs and overhead = projected operating profit and projected cash left. Label it "Based on your forecast and decisions, not a prediction of the market." After each round, show projected vs. actual **Built in PR 4 (Nov 23), waiting for merge.**
- [NOTE] Projected results: check whether this is already in the design brief, or already built on the Forecast & production tab (locked in Practice, not yet reviewed). If it exists, show it on the Review screen; if not, build it. Must be in place before Round 1 **Built in PR 4 (Nov 23), waiting for merge.**
- [P3] Decisions – Review & submit – Team ready: add a "Mark our team ready" button. It doesn't lock or submit anything (saved decisions are still used at the deadline), but it shows the team's status ("Ready" / "Not ready") on the instructor's class screen

## Student: Research (/play/research)

- [P2] Research – Free market survey: deliver it automatically in Practice (it appears under "Your reports" without clicking), or relabel the button "Get free survey". Students shouldn't have to "Buy" a free study that Home tells them to read
- [P2] Research – Study descriptions: add a fuller description for each study (a short paragraph, not one line): what questions it answers, what's in it (tables/charts, by segment and region), when it's most useful, and what marketing concept it teaches. Optionally a sample preview
- [P3] Research – Practice: grey out paid studies during Practice with "Available from Round 1" instead of showing "Buy" with a $0 budget
- [P2] Research – Purchase confirmation: add a pop-up before buying ("Spend $40,000 of your marketing budget on Customer needs? This can't be undone")
- [P2] Research / Instructor – Report preview: let the instructor see a sample of every research report (all 9 studies) without a team buying it, e.g., from the class screen or through "View as student"
- [NOTE] Research – Report contents: Victor wants to co-design what each study contains (questions answered, tables, level of detail, accuracy) before it's final. Draft an outline of all 9 reports for Victor's review (to be done on the main project side) **Built in PR 4 (Nov 23), waiting for merge.**

## Student: Results (/play/results)

- [NOTE] Results – STILL TO REVIEW once results exist (do not consider this screen signed off). Not yet reviewable: no round has been processed, so the Results screen only says "No rounds have been processed yet." Set up a separate throwaway test class, score a round or two there (without touching MKT 475 Test Class 1), then review the Results screen together

## Student: Change log (/play/log)

- [P1] Change log – Plain language: replace raw data ("null", "[]", code like {"id":"pmwrfe2rb","name":"Product 1","tier":"good",…}, field names like "strategy › targetRegions") with readable sentences, e.g., "Test Student #1 created a draft product: Product 1 (Good tier, Budget & First-Time Buyers)" or "changed target segments from none to Everyday Wellness". Needed for students and for the instructor in peer-evaluation disputes (applies to the instructor's Change log CSV export too)
- [P2] Change log – No-op edits: filter out entries where nothing actually changed (e.g., target regions "[]" → "[]")

## Student: Sign-up and join flow (/login, /join)

- [—] Sign in – Description: the line "The MKT 475 marketing strategy simulation. Your team runs a smart health wearables company." works well (keep; use similar wording on the instructor's class list)
- [P1] Join page – Guidance: add the Heart Race header and description, a line explaining the class code (e.g., "Your instructor gives you a 6-letter class code"), and what happens after joining (team assignment and where to go next)
- [P1] Join page – Sign out link: hide "Sign out" when no one is signed in
- [P1] Sign in – Password reset: add a self-service "Forgot password" reset by email so up to 40 students don't all need the instructor to reset passwords (keep the instructor reset as a backup)
- [P1] App-wide – Phone / small-screen layout: the sign-in card is cut off and needs sideways scrolling in a narrow window; check and fix the layout of every screen on phones and small laptops
- [NOTE] Join flow – STILL TO REVIEW: the step after "Find class" (joining and team assignment) couldn't be seen without a real student account; review it in the throwaway test class


## New feature: Creative campaigns (queued Nov 23)

- [P1] Creative campaigns and graded creative work (one feature, not built yet): **Built in PR 4 (Nov 23), waiting for merge.**
  - **Campaign in the sim:** each product gets one campaign with a message, a tone and a target segment, set on the Decisions screen. Teams can edit it every round; if they don't, it carries forward. The sim scores how well the campaign fits the segment (and the product), and that fit affects how well its promotion works.
  - **Creative work submitted 3 times:** teams upload a file or paste a link in the sim (links to Google Drive, YouTube or a live page are simplest; file uploads need storage set up). Digital work only, no print ads.
    - Round 1 launch: a 1-page creative brief, 3 social media posts and 1 search ad.
    - Round 4: 1 or 2 vertical video ads and 1 horizontal video of about 30 seconds. A new 1-page creative brief only if the message changed or the team launched a new product.
    - Final round: a complete product launch landing page that brings together all the earlier work.
  - **Instructor grading screen:** see every team's submission per milestone and grade it with a rubric: fit with the target segment, clarity of the message, creativity, brand consistency, and craft. Optional written feedback the team can see.
  - **Effect in the sim:** the grade becomes a creative quality boost to the team's promotion for the following rounds (until the next graded milestone). Victor's grade also counts in the course outside the sim.
  - **Needs a Learn lesson** on creative briefs and campaigns (what a brief contains, message and tone by segment, social, search and video ad formats, landing pages), plus a short assignment sheet for each milestone and the rubric. The lesson will be added to the drafts later.


## Queued Nov 27: showcase guest notes and per-segment goals (not built, wait for go)

- [P1] Showcase – Guest banner in View as student: a strip on every student screen that says "You're viewing [Team] as a guest. Everything here was entered by this team's students. Read only." with a link back to the class screen. (Today it's hard to tell that these are the team's own choices.)
- [P1] Showcase – "About this screen" side note (guest only, can be collapsed): on each Decisions screen and on Research, Creative and Results, 2 or 3 plain lines on what students decide there, plus a summary of this team's choices that round. Example on Strategy & goals: "CareBand targets Older Adults & Caregivers and Everyday Wellness in North America and Europe, posture: niche. Goals: 18% share, $4.2M revenue." Built from the team's saved decisions, so it stays correct for any round.
- [P2] Showcase – Start here panel on the guest's class screen: 3 steps (look at Class results, open Decisions & results for one team, then View as student), the 4 team strategies in one line each, and a link to the tour document.
- [P1] Goals – Separate market share goal for each target segment: when a team targets more than one segment, the Goals section shows one share goal per target segment instead of a single number, and the Results goal table shows goal vs. actual for each segment.
  - Scoring change: today goal accuracy averages how close the team came on each goal it set (share, revenue, margin, awareness, satisfaction), and that is half of the 10-point Goal and forecast accuracy score (forecast accuracy is the other half). With the change, the share goal's closeness becomes the average across the team's segment goals, so share still counts as one goal. A team with 3 segments isn't weighted more heavily than a team with 1, and a team can't hide a miss in one segment behind a hit in another.
  - Open choice for Victor: weight each segment equally (simplest to explain) or by segment size (a miss in a big segment counts more). Recommend equal.
  - The Market score itself doesn't change (it's already share across target segments, weighted by size); Results would also show share by segment next to the goals.

## Later batch (queued Nov 23, not in the current build)

- [P2] Instructor – Unusual activity flags: the class screen flags agent-like patterns for each team and says why each one was flagged, with an optional email to the instructor once email sending is set up. Examples: every input entered within seconds, only one teammate ever active, rapid bursts of edits at identical speed, edits at odd hours, no round reflection. Wording must make clear a flag is a prompt to look closer, not proof that a student used an AI agent
- [P2] Instructor – Showcase class for faculty peers: a fully played class (Practice through the Final round) that colleagues in the business school can walk through to see what students do, what the results look like and whether the logic makes sense. A few teams with clearly different strategies; every input, report, result, research study, creative submission (placeholder links) and reflection filled in. Colleagues get a read-only guest login so they can browse as the instructor or as any team without changing anything. Include a short step-by-step guided tour document. Victor wants to test PR 4 first (queued Nov 23). Victor said go Nov 23. **Built in PR 5 (Nov 23), waiting for merge.**

---

## Remaining reviews and deferred items

**Step 1: Dummy test class (do next)**

- [NOTE] Create a separate dummy class (do not touch MKT 475 Test Class 1) with made-up students and teams, enter sample decisions, and score at least 2 rounds. Best done on the main project side (seeded data and rounds processed there), since creating student accounts needs passwords set outside this review
- [NOTE] Some pages are not built yet (Victor is aware). Review them as they're completed

**Step 2: Review in the dummy class**

- [NOTE] Results screen (student) and round-by-round feedback: scorecard, round briefings, "Top Concerns"-style warnings
- [NOTE] Locked Decisions tabs: Markets & channels, Price & promotion, Forecast & production, and the Goals section (opens in Round 1). Confirm the agreed features exist: brand awareness funnel, international entry options, channel partners and margins, production orders, warranty / service level / loyalty program, sales forecast, numeric goals
- [NOTE] Market events: how they're announced to teams and how teams respond
- [NOTE] Instructor side after scoring: processed rounds, AI rival decisions, each team's View page with results, and the new results dashboard (P1 above) once built
- [NOTE] Join flow: team-assignment step after "Find class"
- [NOTE] Projected results: whether they exist on Forecast & production (see Review & submit note above)

**Step 3: After the dummy class has numbers**

- [NOTE] Review the 5 CSV exports (scores by round, final weighted scores and grade bands, roster, round reflections, change log)

**Later: design work on the main project side**

- [NOTE] Research reports: co-design the contents of all 9 studies (Claude to draft an outline for Victor's review)
- [NOTE] Learn tab: write the lessons for each round **Built in PR 4 (Nov 23), waiting for merge.**
- [NOTE] App-wide cosmetic / look-and-feel changes (Victor to provide details)
