/** Words students read: round focus, Learn sections and the FAQ. Edit freely. */

export const ROUND_FOCUS = [
  { title: "Organize and research", text: "Name your company, write your team charter, read the free market survey, pick your target segments and regions, and send your first product briefs to engineering. Products briefed now are ready to sell in Round 1. Nothing is scored this round." },
  { title: "Launch", text: "Your first products reach the market. Confirm the target segments and regions you picked in Practice (you can change them until the Round 1 deadline), enter regions, choose channels, set prices, put promotion dollars into each medium, set a campaign for each product and set production. Your first creative work is due on the Creative tab. Set numeric goals and a sales forecast: both count toward your goal-accuracy score." },
  { title: "Go to market", text: "Read your Round 1 results. Adjust price, promotion and ad messages, and fix stockouts or excess inventory. Watch the marketing budget: this is the last fixed release." },
  { title: "Learn and adjust", text: "Head office releases the last $1M. Pace it through the final round. This is your last chance to brief a third product so it's ready in Round 4." },
  { title: "Expand", text: "Third products launch. Consider a second region, more channels and capacity. Engineering fees are now 50% higher. Your video ads are due on the Creative tab." },
  { title: "Compete", text: "Rivals are getting sharper. Push into the segments where you lead and defend against price moves." },
  { title: "Refine", text: "All decisions are open. Tune the mix and keep your forecast tight." },
  { title: "Close strong", text: "The final round counts the most (20%). Finish with your best plan, submit your launch landing page on the Creative tab and write your final reflection." },
];

export const LEARN: Record<string, string> = {
  strategy:
    "Segmentation, targeting and positioning (STP): pick the buyer groups you will serve and say why you are the better choice for them. The Market score counts your share only in the segments you declare here, weighted by their size, so choose deliberately.",
  goals:
    "Numeric goals make a plan testable. Each round the scorecard compares what you said you'd achieve with what happened. Being realistic is rewarded: a wildly optimistic goal costs you points.",
  products:
    "You don't spend an R&D budget. You write a brief for engineering: which segment, which features. Engineering quotes a unit cost, a one-time development fee (paid from company capital) and a lead time of 1 round. Once you accept a quote, the design is locked, because hardware takes a long time to change. Segments aren't the same as tiers: work out which tier serves which segment, and price your tiers so they don't steal sales from each other.",
  markets:
    "You sell through partners, and partners set the terms. Each channel keeps a margin of the retail price; selling direct online keeps the full price but you pay fulfillment. Buyers only find you in the channels where they shop. As your volume in a channel grows, you gain leverage to cut the partner's margin. Spreading thin means paying full margins everywhere.",
  pricing:
    "Price against what each segment expects to pay. Above that, demand falls off fast for price-sensitive segments. Promotion comes in two kinds. Consumer ads (pull) build awareness, each medium reaching some segments better than others, with diminishing returns, and part of it carries into the next round. Trade promotion (push) pays your channel partners to display, stock and recommend your brand, so buyers who shop there meet it in the store; it lasts only the round you pay for it, and partner types respond differently. A campaign aimed at the right segment, in a tone that suits it, makes every ad dollar work harder. Ad claims that match what a segment cares about lift sales, but claims the product can't back up are flagged and hurt satisfaction.",
  production:
    "Your forecast is what you expect to sell. Production is what you make. They don't have to match, but you pay for every unit made: unsold units cost 5% of unit cost per round to hold and are cleared at a loss after 2 rounds. Run short and buyers go to rivals. The factory has a capacity limit; overtime adds up to 20% at a higher cost, and new capacity takes a round to come online.",
  review: "Come here before every deadline to double-check your team's decisions. The checklist below lists anything missing or unfinished, with a link to fix it. There's no submit button: whatever is saved at the deadline is used automatically, and anything you leave unchanged carries forward from last round.",
};

export const FAQ: { q: string; a: string }[] = [
  { q: "How do we submit?", a: "You don't need to. Every change saves automatically, and whatever stands at the deadline is used. Any teammate can edit anything until then; the change log shows who changed what." },
  { q: "What if we miss a deadline?", a: "Your decisions from last round carry forward as they are, and your results are flagged as carried forward." },
  { q: "What is the practice round for?", a: "Getting organized: company name, team charter, the free market survey, target segments and regions, and your first product briefs. It isn't scored, but products briefed in the practice round are the ones you sell in Round 1." },
  { q: "How does the scorecard work?", a: "Five measures, each turned into 0 to 100 points against the best firm that round: Market 30% (share in your target segments, weighted by segment size), Customer 20% (product fit, awareness and satisfaction in those segments), Financial 20% (operating profit and return on promotion), Channel 20% (how many target buyers can find you, minus excess partner margin) and Goal accuracy 10% (how close you came to your own goals and sales forecast)." },
  { q: "Segments vs. tiers?", a: "Segments are groups of buyers (for example Older Adults & Caregivers). Tiers are your product line (Good, Better, Best). One tier can serve several segments, and one segment may buy more than one tier. Research tells you which fits." },
  { q: "Which research should we buy first?", a: "Customer needs tells you what to put in a product. Price willing to pay, Media preferences and the Channel partner survey tell you how to sell it. Competitor benchmark is most useful after Round 1." },
  { q: "How does market entry work?", a: "Enter a region on the Markets & Channels screen. A distributor is cheap but keeps extra margin and reaches fewer buyers; a local partner costs more; your own subsidiary costs the most but gives the best reach and no extra margin. The entry fee comes out of company capital." },
  { q: "Where does money come from?", a: "Two pots. The marketing budget ($500K in Round 1, $500K in Round 2, then $1M to pace yourself, plus a top-up based on last round's revenue) pays for promotion and research; unspent money carries over. Company capital ($3M to start, plus what you earn) pays for engineering, production, entry and capacity. Both show up in your profit and loss." },
  { q: "Who are the other firms?", a: "Every market has 8 firms. Any spots not taken by student teams are AI rivals. They follow the same rules and the same market model; some are premium, some low-cost, some copy the leader. They get sharper as the game goes on." },
  { q: "How does promotion work?", a: "On the Price & promotion tab you enter dollars for each product in each region, in four media. Digital & social, Search and Traditional media are consumer ads (pull): they build awareness, most in the segments each medium reaches best. Trade promotion (push) pays your channel partners for displays, shelf space and staff incentives: buyers who shop there meet your brand in the store, and partners stock it more widely. It works only through partners, not your own website. The Promotion results report on the Results tab shows what each dollar bought." },
  { q: "What is the Creative tab?", a: "Three times in the game (Round 1, Round 4 and the Final round) your team submits links to real creative work: a creative brief and ads, then video ads, then a launch landing page. Your instructor grades it on segment fit, message clarity, creativity, brand consistency and craft. A grade above 3 out of 5 makes your ads work better in the sim from the next round; below 3 makes them work worse." },
  { q: "What are market events?", a: "From Round 3, events like a chip shortage or a privacy scare may hit the market. They'll be announced in the round briefing. (Coming later in the term.)" },
];

/** Fuller descriptions of each research study, shown on the Research screen. Edit freely. */
export const STUDY_INFO: Record<string, { answers: string; contents: string; when: string; concept: string }> = {
  survey: {
    answers: "How big is each buyer group, and roughly what does each one want?",
    contents: "One table for the 5 segments (all regions combined): approximate buyers per round, the typical price paid and the top features each segment wants.",
    when: "Practice round, before you write your first product briefs. It's free, so every team should get it.",
    concept: "Market segmentation: dividing a market into groups of buyers with different needs.",
  },
  needs: {
    answers: "Which features does each segment care about most, and which ad messages and tones will land with them?",
    contents: "Focus groups in every segment rate each product feature from \"Doesn't care\" to \"Must have\" (every sensor, chip, form, battery, display, materials, water resistance and privacy), plus interest in a premium app plan, the ad claims and campaign tones each segment responds to, and a one-line ideal product for each segment. Results stay valid all game unless a market event changes buyers' tastes.",
    when: "Before you brief a product (Practice, or Round 3 for a third product), and when choosing ad claims.",
    concept: "Customer needs and product-market fit: designing what a target segment values, not everything.",
  },
  potential: {
    answers: "How many buyers will each segment have next round, in each region?",
    contents: "A table of expected units next round for every segment and region, accurate to about 5%.",
    when: "Before you set your sales forecast and production, and when deciding which region to enter next.",
    concept: "Market sizing and demand forecasting.",
  },
  price: {
    answers: "What do typical buyers expect to pay, and what is the most almost anyone will pay?",
    contents: "For each segment and region: the typical price and the price ceiling.",
    when: "Before you set prices (from Round 1), and when you plan a Good/Better/Best price ladder.",
    concept: "Value-based pricing, reference prices and price sensitivity.",
  },
  media: {
    answers: "Which consumer media reach each segment best?",
    contents: "How well Digital & social, Search and Traditional media reach each segment (1.0 = average), with notes on how to use it. Where buyers shop is in the Channel partner survey.",
    when: "Before Round 1, when you split your consumer ad dollars across media.",
    concept: "Media planning: advertise where your target buyers will see it.",
  },
  awareness: {
    answers: "How many buyers know each of your products after last round?",
    contents: "Awareness of each of your products in each region and segment.",
    when: "From Round 2, to check whether promotion is working and where to spend more or less.",
    concept: "The awareness stage of the purchase funnel and advertising carry-over.",
  },
  satisfaction: {
    answers: "How happy are your buyers after they purchase?",
    contents: "Satisfaction for each of your products after last round, compared with the industry average. Fit, fair prices, honest ads and staying in stock all drive it.",
    when: "From Round 2, especially after a price change, a stockout or a flagged ad claim.",
    concept: "Customer satisfaction, loyalty and word of mouth.",
  },
  competitors: {
    answers: "What do rivals sell, at what price, and how much of each segment did they win?",
    contents: "Every firm's products, tiers and prices by region, each firm's share of units by segment, and estimated promotion spending.",
    when: "From Round 2 (after rivals have launched), before repositioning or changing price.",
    concept: "Competitive analysis and positioning against rivals.",
  },
  partners: {
    answers: "Where do your target buyers shop in each region, which partners reach them, and how hard will each type of partner push your brand?",
    contents: "Where each segment shops in each region; how many buyers each channel reaches there; each partner type's willingness to push when you invest in trade promotion; which firms are already on each partner's shelf; your leverage with each partner and units to the next margin cut; and what a $100 sale pays you in each channel.",
    when: "Before Round 1, when you choose channels and split promotion between consumer ads and trade promotion, and again when you enter a new region.",
    concept: "Channel strategy and push vs. pull: partners are customers too.",
  },
};
