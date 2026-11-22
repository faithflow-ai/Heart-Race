/** Words students read: round focus, Learn sections and the FAQ. Edit freely. */

export const ROUND_FOCUS = [
  { title: "Organize and research", text: "Name your company, agree on how your team works, read the free market survey and send your first product briefs to engineering. Products briefed now are ready to sell in Round 1. Nothing is scored this round." },
  { title: "Launch", text: "Your first products reach the market. Pick target segments and regions, choose channels, set prices, split promotion and set production. Set numeric goals and a sales forecast: both count toward your goal-accuracy score." },
  { title: "Go to market", text: "Read your Round 1 results. Adjust price, promotion and ad messages, and fix stockouts or excess inventory. Watch the marketing budget: this is the last fixed release." },
  { title: "Learn and adjust", text: "Head office releases the last $1M. Pace it through the final round. This is your last chance to brief a third product so it's ready in Round 4." },
  { title: "Expand", text: "Third products launch. Consider a second region, more channels and capacity. Engineering fees are now 50% higher." },
  { title: "Compete", text: "Rivals are getting sharper. Push into the segments where you lead and defend against price moves." },
  { title: "Refine", text: "All decisions are open. Tune the mix and keep your forecast tight." },
  { title: "Close strong", text: "The final round counts the most (20%). Finish with your best plan and write your final reflection." },
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
    "Price against what each segment expects to pay. Above that, demand falls off fast for price-sensitive segments. Promotion builds awareness with diminishing returns, and part of it carries into the next round, so steady spending beats one splurge. Ad claims that match what a segment cares about lift sales, but claims the product can't back up are flagged and hurt satisfaction.",
  production:
    "Your forecast is what you expect to sell. Production is what you make. They don't have to match, but you pay for every unit made: unsold units cost 5% of unit cost per round to hold and are cleared at a loss after 2 rounds. Run short and buyers go to rivals. The factory has a capacity limit; overtime adds up to 20% at a higher cost, and new capacity takes a round to come online.",
  review: "Check the budget and projected results before the deadline. Whatever is saved at the deadline is submitted automatically. Anything you leave unchanged carries forward from last round.",
};

export const FAQ: { q: string; a: string }[] = [
  { q: "How do we submit?", a: "You don't need to. Every change saves automatically, and whatever stands at the deadline is used. Any teammate can edit anything until then; the change log shows who changed what." },
  { q: "What if we miss a deadline?", a: "Your decisions from last round carry forward as they are, and your results are flagged as carried forward." },
  { q: "What is the practice round for?", a: "Getting organized: company name, team norms, the free market survey and your first product briefs. It isn't scored, but products briefed in the practice round are the ones you sell in Round 1." },
  { q: "How does the scorecard work?", a: "Five measures, each turned into 0 to 100 points against the best firm that round: Market 30% (share in your target segments, weighted by segment size), Customer 20% (product fit, awareness and satisfaction in those segments), Financial 20% (operating profit and return on promotion), Channel 20% (how many target buyers can find you, minus excess partner margin) and Goal accuracy 10% (how close you came to your own goals and sales forecast)." },
  { q: "Segments vs. tiers?", a: "Segments are groups of buyers (for example Older Adults & Caregivers). Tiers are your product line (Good, Better, Best). One tier can serve several segments, and one segment may buy more than one tier. Research tells you which fits." },
  { q: "Which research should we buy first?", a: "Customer needs tells you what to put in a product. Price willing to pay and Media and channel preferences tell you how to sell it. Competitor benchmark is most useful after Round 1." },
  { q: "How does market entry work?", a: "Enter a region on the Markets & Channels screen. A distributor is cheap but keeps extra margin and reaches fewer buyers; a local partner costs more; your own subsidiary costs the most but gives the best reach and no extra margin. The entry fee comes out of company capital." },
  { q: "Where does money come from?", a: "Two pots. The marketing budget ($500K in Round 1, $500K in Round 2, then $1M to pace yourself, plus a top-up based on last round's revenue) pays for promotion and research; unspent money carries over. Company capital ($3M to start, plus what you earn) pays for engineering, production, entry and capacity. Both show up in your profit and loss." },
  { q: "Who are the other firms?", a: "Every market has 8 firms. Any spots not taken by student teams are AI rivals. They follow the same rules and the same market model; some are premium, some low-cost, some copy the leader. They get sharper as the game goes on." },
  { q: "What are market events?", a: "From Round 3, events like a chip shortage or a privacy scare may hit the market. They'll be announced in the round briefing. (Coming later in the term.)" },
];
