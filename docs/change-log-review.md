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


## Nov 27: showcase guest notes and per-segment goals (Victor said go Nov 27; built in PR 6, waiting for merge)

- [P1] Showcase – Guest banner in View as student: a strip on every student screen that says "You're viewing [Team] as a guest. Everything here was entered by this team's students. Read only." with a link back to the class screen. (Today it's hard to tell that these are the team's own choices.)
- [P1] Showcase – "About this screen" side note (guest only, can be collapsed): on each Decisions screen and on Research, Creative and Results, 2 or 3 plain lines on what students decide there, plus a summary of this team's choices that round. Example on Strategy & goals: "CareBand targets Older Adults & Caregivers and Everyday Wellness in North America and Europe, posture: niche. Goals: 18% share, $4.2M revenue." Built from the team's saved decisions, so it stays correct for any round.
- [P2] Showcase – Start here panel on the guest's class screen: 3 steps (look at Class results, open Decisions & results for one team, then View as student) and each team's target segments and positioning. (Built without a link to the tour document, since the app doesn't store that link.)
- [P1] Showcase – Found while building: in a finished class, View as student showed "The game is over" on the Decisions tab. It now shows the team's Final round decisions, read-only, with a link to Past decisions for earlier rounds.
- [P1] Goals – Separate market share goal for each target segment: when a team targets more than one segment, the Goals section shows one share goal per target segment instead of a single number, and the Results goal table shows goal vs. actual for each segment.
  - Scoring change: today goal accuracy averages how close the team came on each goal it set (share, revenue, margin, awareness, satisfaction), and that is half of the 10-point Goal and forecast accuracy score (forecast accuracy is the other half). With the change, the share goal's closeness becomes the average across the team's segment goals, so share still counts as one goal. A team with 3 segments isn't weighted more heavily than a team with 1, and a team can't hide a miss in one segment behind a hit in another.
  - Decided (Victor, Nov 27): each segment goal is weighted equally, not by segment size.
  - The Market score itself doesn't change (it's already share across target segments, weighted by size); Results would also show share by segment next to the goals.

## Nov 27: "class in progress" for colleagues (Victor said go Nov 27; built in PR 6, waiting for merge)

- [P1] Showcase – Second guest class, "in progress": the same 4 teams, with the Practice round and Round 1 already played and Round 2 open. Round 2's inputs start blank (no carry-forward fill), so colleagues see exactly what students face each week. Uses the same guest login as the finished showcase, so colleagues see both classes after signing in.
  - **Try-it mode:** the guest can type in every field and click through the screens (send a brief, accept a quote, enter prices and promotion) to feel the workload. Nothing is saved or processed: a banner says "Practice mode: you can type here to try it, but nothing is saved and no round will run," and the entries clear when the page reloads.
  - Round 1 results, research and the change log are there to read, so colleagues can see what students have to work from.
  - Claude's recommendation: one in-progress class plus the finished showcase is enough. A third class would add setup without showing anything new.
  - As built: Create showcase class now makes both classes. Products, regions, channels and strategy carry over into Round 2; the weekly inputs (prices, promotion, forecast, production, goals) start at zero or blank. Deleting the finished class also deletes the class in progress.

## Nov 27: Branding and look (Victor picked Pulse and said go Nov 27)

**PR 7 (built Nov 27):** Pulse look (colors, fonts, logo, favicon, score bars no longer red), new menu with More, round tracker on every team screen, Start here (replaces How it works; first-login landing; 5 steps with a quick check), Decisions step list with money rail, bottom bar and Last edited by, Home "Due this round" list, Learn boxes stay closed once read. Everything else below is for the next PR.

**PR 8 (built Nov 27):** positioning map exercise on step 1 (2 axes, drag dots, confirm; required in Practice, R3, R4, Final; not scored), Results summary card, contents bar, segment-by-segment panels with actual vs. potential share, reality check map, round-by-round charts, team colors and monograms, glossary hover terms, comma number fields. Still later: unusual activity flags, instructor heatmap, branded login and join pages, round-scored reveal, empty-state pass, pre-deadline warnings.

Look book with 3 brand directions and mockups: https://claude.ai/artifact/Jfvo5wV3orCMr1xFTKQRAk. Claude recommends A (Pulse: navy, pulse red, mint; heartbeat-line logo; Space Grotesk + Inter), plus "A Vibe Electronics simulation" under the logo and board meetings on the round tracker (from C).

- [P1] App-wide – Round tracker on every screen: Practice to Final, current round, deadline countdown, teammates marked ready
- [P1] Decisions – Tabs: show each tab's status (done, needs attention, opens in Round X) and a bottom bar with budget left, saved state and a Next button
- [P1] App-wide – Top menu (revised Nov 27 per Victor): Start here, Home, Decisions, Results, Research, Learn, Creative; only Past decisions and Change log under More
- [P1] App-wide – Color meaning: score bars stop using red; red only for action buttons, amber/red for warnings, green for done
- [P2] Results – Charts: score, share by segment, revenue and profit by round
- [P2] Home – "Due this round" checklist in place of the single button
- [P2] Team – Team color and monogram picked in Practice, used on the leaderboard and charts
- [P2] Decisions – Money inputs show $ and commas while typing, with running totals
- [P2] App-wide – Learn boxes stay closed once read
- [P3] Login and join – Branded pages with the logo and one line of story
- [P3] Results – Short "round scored" reveal card (rank change, top win, top concern)
- [P3] Instructor – Class screen and dashboard in the new style
- [P3] App-wide – Logo files and favicon (also for slides and syllabus)

Added Nov 27 after Victor picked Pulse (look book Part 2):

- [P1] Decisions – Layout: replace the 6 tabs with a left step list (done / needs attention / locked until Round X), a right rail with budget and capital left updating as students type plus last round's value for the same field, and a bottom bar (Saved, who edited last, Next step). Supersedes the P1 tab status item above
- [P1] App-wide – Round tracker shows board meetings (R4 and Final) with an amber mark
- [P2] App-wide – Teammates online: initials in the top bar and which screen each teammate is on
- [P2] App-wide – Glossary: marketing terms get a dotted underline with a hover definition and a link to the Learn lesson
- [P2] Results – Charts highlight your team in red and rivals in grey
- [P2] App-wide – Graphic kit: segment icons (also on research, targeting and charts), region outlines, status chips with one meaning per color, team badges (AI rivals grey)
- [P2] App-wide – Empty states that teach (e.g., no research yet points to where most teams start, without telling them what to do)
- [P2] Home – Pre-deadline warnings for gaps (e.g., $0 promotion in a target region, production far from forecast)
- [P3] App-wide – Pulse line used sparingly: loading animation, login divider, round-scored moment
- [P3] Instructor – Class heatmap of who's ready, team badges on the dashboard
- [—] Dark mode: not planned (Claude's recommendation)

Added Nov 27, second round (Victor's notes; look book items 6 to 8):

- [P1] Start here – Rename "How it works" to "Start here," first link in the menu, highlighted with a progress count (e.g., 2/5) until finished. On first login students land here instead of Home. Five steps: scenario briefing, meet your team and write the charter, how a round works, how you're scored and graded, a 5-question quick check, then on to Practice. After it's finished it stays as the rules and FAQ reference without the highlight. Optional 2-minute welcome video from Victor at the top
- [P1] Decisions – Flow: clicking Decisions opens step 1 and Next walks through to Review and ready; any step can be clicked to jump; in later rounds it opens on the first step that needs attention
- [P1] Strategy and goals – Positioning map exercise (revised Nov 27 per Victor): the team picks 2 axes from the sim's buying criteria (price, battery life, heart and sleep insights, safety alerts, training accuracy, design and comfort, data privacy, durability, health app) with a one-line why; drags its products, target segments and up to 3 rivals to where it believes they sit; adds the positioning statement under the map. Required in Practice (step 1), revisable every round, required again in Round 3 (before the redesign window) and before each board meeting
- [P1] Results – Positioning reality check: after each round, buyers' actual perceptions are laid over the team's map on the same axes, sharper with the Customer needs study. Shows the gap between intended and perceived position
- [P1] Grading – Positioning map is not in the sim scorecard (can't be gamed); done/not done on the Review checklist; teams present the map and the gap at the board meetings, scored under the rubric's positioning part
- [P2] App-wide – Warnings count on the round tracker that opens the list (borrowed from Markstrat)
- [P2] Home – One summary card per decision step with its key number, to review the whole plan before the deadline (borrowed from Capsim)
- [P2] Decisions – Projected margin and units shown next to price and promotion inputs as students type (uses the existing pro forma)
- [P2] Decisions – Team "why we did this" note per step, saved with the round (feeds the board meetings)
- [P3] App-wide – AI tutor that guides without answering (Capsim has one): later term at the earliest, because of cost and the risk of telling students what to do

Added Nov 27, from the review of Victor's Capsim account (look book item 9):

- [P2] Results – One repeated panel per segment: key stats, what buyers weigh, positioning map, actual vs. potential share; same layout for all 5 segments with Next segment links
- [P2] Results – Actual vs. potential share chart (share won vs. share the team could have won), for the debrief
- [P2] Research – Buying-criteria importance shown only in the Customer needs study, rounded to bands, never free and never exact (Learn lessons still give no exact numbers)
- [P2] Reports – Clickable contents list at the top of long reports; same header on every section (report, round, team)
- [P2] Decisions – "Last edited by [name], [day time]" on each decision step
- [P2] App-wide – Design rules: flat charts only (no 3D); map labels never overlap; units always shown ($250K); no raw system names or zero rows for products a team doesn't have; specific button labels (never just "Continue"); one look and one address, no reports in scrolling frames; empty tables explain why and what to do next

## Nov 27: Money and unit math tuning (Victor said go Nov 27; **built in the economics update PR, waiting for merge**)

Found by running a simulated class (`npm run balance`). Company capital in the code is $3M (not $4M), plus the $2M marketing-only budget and earned top-ups.

- [P1] Economy – Cost declines (Victor's settings, Nov 27): (1) industry component prices drop 2% per round (was 3%); (2) replace the doubling learning curve with published volume milestones: a product's unit cost drops 5% when its total units made (all rounds, all regions) reach 50,000, 150,000 and 300,000, so the lowest is 85% of the starting cost; (3) buyer price expectations stay flat, so only a team's own price cuts move prices. Tell students in one findable place, without pushing it at them: a "How costs work" section in Start here states the 2% per round component decline and the volume milestones, with a one-line note under the engineering quote ("Costs fall over time; see How costs work"). No Results nudge: if students don't look, they don't see it (Victor, Nov 27). Balance check with these settings: late-round gross margin about 47-51% and operating margin about 24-31% (was 63-65% and 40-45%). Round 1 unchanged
- [P1] Economy – **Victor approved Nov 27 (wait for go to build): HQ emergency loan at about 3% interest per round when capital would go below zero, with a warning.** Capital never runs out in a meaningful way: firms end with $8M-$37M and nothing to use it on, and production is never checked against cash, so a team can overproduce into negative capital with no consequence beyond being blocked from new products and expansion. Proposed: if capital would go below zero, Vibe Electronics HQ advances an emergency loan with interest (about 3% per round, charged to profit), shown with a clear warning on Results. Optional: an idle-cash charge or a "return cash to HQ" choice so a big cash pile isn't free
- [P2] Economy – Starting numbers otherwise check out: keep $3M capital and the $2M marketing budget. Marketing runs about 9-17% of revenue across rounds, which matches real wearable brands (about 10-20%). Round 1 is the tight round (lowest firm capital about $2.2M), which is the right place for pressure

## Nov 27: Engine and scoring audit (Victor said go Nov 27; **built in the economics update PR, waiting for merge**, except the dropped item)

Tested by having one team play variations of the same strategy against 7 rivals, 3 market draws each. Good news: no single strategy wins. Pricing 30% low lost money and finished near last, cutting promotion 90% ranked near last, and doubling promotion added nothing (diminishing returns work).

- [P1] Engine – **Victor approved the direction Nov 27 (wait for go to build):** partners stock much less with no trade support. Segment-aware (Victor, Nov 27): the cut applies only in partner channels, never on the team's own website, so a team selling direct loses nothing from skipping trade support. The loss scales with how much the team's target segments shop through partners (about 70-90% for most segments, 70% for Businesses & Insurers through business distributors). Push (trade promotion) barely matters: moving all trade money into digital ads cost only about 1 point of the weighted score with the same profit. Since push vs. pull balance is a core teaching goal, push should count for more. Proposed: make partner stocking depend on trade support (partners carry less of a brand that gives them nothing, so ads alone reach fewer shelves), and add a "push/pull balance" factor to the channel score. Re-test so all-pull and all-push both clearly lose to a balance
- [P1] Scoring – **Victor approved Nov 27 (wait for go to build):** score operating profit before one-time costs, and amortize capacity expansion over 4 rounds (same idea as depreciation). The financial score punishes investing: it uses this round's operating profit, which includes one-time costs (development fees, region entry, channel setup, capacity expansion). A team that enters a new region or launches a product takes the hit all in that round. Proposed: score on operating profit before one-time investments (show those separately on the P&L), or spread them over 4 rounds. Also, "return on promotion" (30% of the financial score) rewards cutting promotion; switch it to marketing ROI over the last 2 rounds so a cut can't game it
- [P2] Scoring – **Victor approved Nov 27 (wait for go to build):** a blank goal scores zero. Goal accuracy can be gamed: goals left blank are skipped, so a team that sets only one easy goal (such as satisfaction) scores slightly higher than a team that sets all five. Proposed: a blank goal counts as a miss (all goals required)
- [DROPPED] Scoring – Target segments changing each round: Victor decided Nov 27 this is fine. Dropping a target is a strategy choice, and the test showed narrowing targets didn't raise the overall score
- [P1] Scoring – Channel score fairness (Victor approved Nov 27: compare margins with the norm for the team's target segments; wait for go to build): the channel score cuts points when the average partner margin is above 15%, which penalizes teams that rightly sell through high-margin partners. A team targeting Older Adults (45% buy at pharmacies, which take 40%) loses about 15% of its channel points compared with an online seller (up to 25% if pharmacy-only). Proposed: compare margins with the norm for the team's target segments (or drop the margin penalty) and add the push/pull balance factor already queued
- [P2] Scoring – Financial score scaling (Victor approved Nov 27: compare profit with the best firm; wait for go to build): profit is scaled so the worst firm gets 0 and the best 100, even if every firm is profitable. One runaway firm squashes everyone else, and the grade curve (percent of the best student team) amplifies it. Proposed: score profit compared with the best firm, like the other 4 parts
- [P2] Messaging – Wording only, no cap (top-ups are already capped at $1.5M per round and 50% growth per round). Most marketing money is earned, not the $2M: the top-up (10% of last round's revenue, plus $50K) reaches about $0.5M-$1M per round by mid-game, so firms spend $7M-$11M on marketing over the game. That's fine economically (marketing stays about 10-17% of revenue), but the briefing should say "$2M to start, then you earn more by selling" so students aren't surprised
- [P1] Budget – Per-round marketing cap (Victor approved the idea Nov 27; numbers proposed, waiting for his OK): keep the $2M releases as they are ($500K R1, $500K R2, $1M R3 paced) and the earned top-ups. New rule: promotion plus research in one round can't exceed the greater of $500K or 20% of last round's revenue. Unspent money still carries over. Spending above the cap is cut back, with a note (same as the current over-budget cut). Show "This round's spending limit: $X" on the money rail
- [P1] Markets – Region exit (Victor approved Nov 27): a team can exit a region it entered. A one-time exit cost of half the entry fee ($25K distributor, $75K local partner, $200K subsidiary) ends that region's $40K per round overhead. Leftover stock there is cleared at a discount, and awareness fades as it does now. Teams can still enter regions they haven't entered. Re-entering an exited region is allowed at the full entry fee plus channel setup fees again
- [P2] Channels – Reset volume discounts on return (Victor approved Nov 27): leaving a channel stays free, but a team that leaves a channel in a region and later comes back starts over at the partner's normal margin (leverage units reset to zero)

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

## Nov 28: Practice to Round 2 test findings (Victor triaging; queued, build when Victor says go)

Findings: /mnt/project-files/Heart Race/Test_Practice_to_R2_Findings.md

- [P1] (Victor, Nov 28; item 1) Proper cost accounting: a unit's cost counts in profit when it's sold (or cleared), not when it's made. Unsold units stay as inventory at cost. Cash still pays for units when they're made. Losses score below 0 on the Financial score's profit part (floor -100 points, where -100 = a loss as big as the best firm's profit). Pro forma updated to match. **Started on branch claude/project-thread-jjhznp, not in a PR yet.**
- [P1] (Victor, Nov 28; item 2) Warn students when company capital is below $0 or has run out, or can't cover the plan: accepted quotes whose development fee can't be paid (HQ's loan doesn't cover engineering fees, so the product isn't developed), capacity expansion that will be skipped, and production that costs more than the capital left. Show on Products, Forecast and production, Review and in the checklist. **Started on branch claude/project-thread-jjhznp, not in a PR yet.**
- [P1] (Victor, Nov 28; item 3) Block buying a research study when it has no data yet: Competitor benchmark, Awareness tracking and Satisfaction survey can't be bought until Round 2 (after products have been on the market). The Research screen shows "Available from Round 2" for them.
- [P2] (Victor, Nov 28; item 4) Buyers who switch to you because a rival ran out of stock count in your demand too, so "Sold" never exceeds "Demand" and actual share never exceeds potential share. Results explains it: "includes N buyers who came over when rivals ran out of stock".
- [P2] (Victor, Nov 28; item 5) "Run projection" in Round 1: fill in each rival with a typical launch plan (the AI rivals' logic) instead of assuming rivals repeat Practice, which left the market empty. Other teams' drafts stay private. Round 2 on unchanged. Explain on Review that the pro forma (own forecast) and the projection (buyer model) will differ.
- [P2] (Victor, Nov 28; item 6) Production screen always shows what the planned units cost and how much capital is left for them after this round's fees, with the red capital warning (item 2) when production costs more than that. **Added to PR 13.**
- [DECIDED] (Victor, Nov 28; item 7) Keep the AI ramp as is (about 4 early, 7.5 in the Final round). Why the AI did well in Round 1: at level 4 it entered two regions, designed close to what buyers want, chose the channels where its buyers shop and priced each region separately. That's what students are supposed to learn to do, using research, so the AI is the benchmark. A lower ramp was tried and reverted.
- [P2] (Victor, Nov 28; item 8) Research page shows the same "marketing budget left" as Home and Decisions (after planned promotion). A study that doesn't fit what's left, or would push promotion plus research past the spending limit, can't be bought (on screen and on the server), with a note to lower planned promotion first. **Added to PR 13.**
- [P2] (Victor, Nov 28; item 9) Step checkmarks mean "done", not "carried forward". From Round 2 on, a Decisions step nobody on the team has changed this round shows an amber "Carried forward, review it" instead of a green ✓. It turns green when someone saves a change or clicks "Looks right, keep it". A step that depends on a missing earlier step (for example Forecast and production with no region entered) shows "Waiting on Regions and channels" instead of ✓. Nothing blocks a team, and untouched inputs still carry forward as now. **Queued, build when Victor says go.**
- [P2] (Victor, Nov 28; item 9) Leftover stock: on Forecast and production, add a line under each row, "Units available to sell = in stock now + production", and a warning on that row and on Review when stock plus production is well above the forecast (about 1.5 times or more), for example "You have 18,000 units in stock now and plan to make 44,000 more, against a forecast of 30,000. Stock you already have sells first." **Queued, build when Victor says go.**
- [DECIDED] (Victor, Nov 28; item 10) No change for a team that skips Practice: if a team does no work, it has nothing to sell in Round 1 and loses those points. No extra warning or safety net.
