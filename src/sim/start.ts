/** Start here: the first stop for every student. Steps are checked off per student. */
export const START_STEPS = [
  { id: "briefing", title: "Read the scenario briefing", minutes: 10 },
  { id: "team", title: "Meet your team and write your charter", minutes: 10 },
  { id: "round", title: "How a round works", minutes: 5 },
  { id: "scoring", title: "How you're scored and graded", minutes: 5 },
  { id: "quiz", title: "Quick check: 5 questions", minutes: 5 },
] as const;
export type StartStepId = (typeof START_STEPS)[number]["id"];

/** Quick check: rules of the game only, never strategy advice. `answer` is the index of the right choice. */
export const QUIZ: { q: string; choices: string[]; answer: number; why: string }[] = [
  {
    q: "How do your team's decisions get submitted each round?",
    choices: ["One teammate presses Submit", "Whatever is saved at the deadline is used", "The instructor collects them in class"],
    answer: 1,
    why: "There's no submit button. Everything saves as you type, and the saved version at the deadline is used.",
  },
  {
    q: "What happens if your team changes nothing in a round?",
    choices: ["The team scores zero", "Last round's decisions carry forward", "The round is skipped for your team"],
    answer: 1,
    why: "Missing inputs carry forward from the last round.",
  },
  {
    q: "Which segments count toward your Market score?",
    choices: ["All five segments", "Only the target segments you declare", "Only the largest segment"],
    answer: 1,
    why: "Market share counts only in the target segments you choose on step 1, weighted by their size.",
  },
  {
    q: "You accept engineering's quote for a new product this round. When can it go on sale?",
    choices: ["This round", "Next round", "In the Final round"],
    answer: 1,
    why: "Lead time is one round: a product accepted this round sells from next round.",
  },
  {
    q: "What pays for engineering fees and production?",
    choices: ["The marketing budget", "Company capital", "Your instructor"],
    answer: 1,
    why: "The marketing budget is for promotion and research only. Engineering, production and region entry come from company capital.",
  },
];
