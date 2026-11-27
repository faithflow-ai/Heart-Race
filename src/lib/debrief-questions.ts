// Kept apart from debrief.ts so the browser bundle doesn't pull in the hidden market numbers.

/** Discussion questions for each debrief slide. Questions only: they never point to an answer. */
export const DEBRIEF_QUESTIONS: Record<string, string[]> = {
  leaderboard: [
    "Which part of the scorecard moved your total the most this round? Did you expect that?",
    "What did the firms that moved up do differently from last round?",
  ],
  segments: [
    "Which segment did your team set out to win? Did the buyers there choose you?",
    "Where buyers wanted your product but bought someone else's, what got in the way: stock, stores, awareness or price?",
  ],
  pushPull: [
    "How did your team split promotion between buyers (pull) and channel partners (push)? Why that split?",
    "What do partners need from a brand before they push it to shoppers?",
  ],
  supply: [
    "How did your team build its sales forecast? What would you change about the method?",
    "What did running out of stock, or holding extra stock, cost you this round?",
  ],
  goals: [
    "Which goal was furthest from the actual result? Was the goal off, or the plan?",
  ],
  season: [
    "What has your strategy been so far, in one sentence? Has it changed, and why?",
    "Which round taught your team the most?",
    "What will you tell the Vibe Electronics board you're going to do next?",
  ],
};
