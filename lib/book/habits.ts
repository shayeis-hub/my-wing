/**
 * Content for "book mode" — the companion experience for Shai's book
 * "One Habit at a Time: The Eight-Habit Method for Losing Weight Without
 * Dieting." Source: ~/Downloads/ONE-HABIT-AT-A-TIME-final-EN.md.
 *
 * English only for now — the book is English-only and phase-1 distribution
 * is Amazon US. This is the single source of truth for both the habits UI
 * (app/(app)/habits/page.tsx) and the AI system-prompt injection
 * (lib/ai/claude.ts) — don't duplicate this content elsewhere.
 */

export interface HabitObjection {
  q: string;
  a: string;
}

export interface HabitSituation {
  situation: string;
  tip: string;
}

export interface Habit {
  id: string;
  order: number;
  name: string;
  /** Short hook shown as a subtitle — the book's opening scene for the habit. */
  tagline: string;
  cue: string;
  routine: string;
  reward: string;
  triggerSentence: string;
  /** Why this habit works — 2-3 short points, book's "What X does" section. */
  whyItWorks: string[];
  /** The book's "I know what you're thinking" objection-handling, trimmed. */
  objections: HabitObjection[];
  /** The book's "Hard situations" section, trimmed. */
  hardSituations: HabitSituation[];
}

export const HABITS: Habit[] = [
  {
    id: "water",
    order: 1,
    name: "Water Before Food",
    tagline: "Your brain mixes up hunger and thirst more often than you'd think.",
    cue: "You're about to eat or drink something — anything.",
    routine: "A full glass of water first.",
    reward: "You arrive at the meal calmer and less ravenous — you'll notice it immediately.",
    triggerSentence: "Before I eat anything, I drink a full glass of water.",
    whyItWorks: [
      "Hunger and thirst signals overlap in the brain — mild dehydration often gets misread as hunger.",
      "Water takes up stomach volume before food arrives, so less food is needed to feel satisfied.",
      "It buys you ten seconds of not eating on autopilot — enough to ask \"am I actually hungry?\"",
    ],
    objections: [
      { q: "I'll be in the bathroom all day.", a: "For the first 3-5 days, yes — your body is recalibrating. That's the transition, not a problem." },
      { q: "I don't like the taste of water.", a: "Add lemon, mint, cucumber, or frozen berries. Herbal tea counts. Just nothing with sugar." },
      { q: "This seems too small to matter.", a: "That's the point — it's light enough that you'll actually do it three times a day for a month." },
    ],
    hardSituations: [
      { situation: "Restaurants", tip: "A glass before the appetizer, before the main, before dessert." },
      { situation: "Drinking alcohol", tip: "One glass of water per drink — blunts dehydration and appetite both." },
      { situation: "Traveling", tip: "Empty bottle through security, fill it after." },
    ],
  },
  {
    id: "protein",
    order: 2,
    name: "Protein First",
    tagline: "The salad that looked perfect and still left you starving by 3:15.",
    cue: "You're about to build a meal or order one.",
    routine: "The first question is \"where's my protein?\" — everything else gets decided after.",
    reward: "You're not hungry two hours later, and you notice the difference within days.",
    triggerSentence: "Before I decide anything else about a meal, I decide the protein.",
    whyItWorks: [
      "Protects muscle while you lose fat — without enough protein, a calorie deficit pulls from lean tissue too.",
      "It's the most filling macronutrient, through both appetite signals and meal structure.",
      "On a GLP-1 medication, this is the highest-value habit — appetite suppression makes it easy to under-eat protein.",
    ],
    objections: [
      { q: "I don't lift weights, so I don't need much protein.", a: "It's not for the gym — it's for keeping the muscle you have while you lose fat. Matters more if you don't train, not less." },
      { q: "I don't eat meat.", a: "Greek yogurt, cottage cheese, eggs, lentils, beans, tofu, tempeh, edamame, protein powder." },
      { q: "I can't eat that much.", a: "Spread it out — three meals at 35-40g each gets most people there." },
    ],
    hardSituations: [
      { situation: "Restaurants", tip: "Decide the protein before looking at anything else — steak, chicken, fish, eggs at brunch." },
      { situation: "Someone else's house", tip: "Eat the protein first, physically, as an order of operations." },
      { situation: "Travel days", tip: "A shaker with protein powder in a bag solves the airport." },
    ],
  },
  {
    id: "half-plate",
    order: 3,
    name: "Half the Plate",
    tagline: "Your stomach can't count calories — it measures volume.",
    cue: "An empty plate in your hand.",
    routine: "Vegetables fill half of it before anything else goes on. Eat them first.",
    reward: "You finish meals comfortably full instead of heavy, and the 4pm hunger fades.",
    triggerSentence: "When I build a plate, vegetables go on first and cover half.",
    whyItWorks: [
      "Stomach stretch receptors measure volume, not calories — a fast-food burger and a plate of vegetables can weigh the same to your brain.",
      "Fiber slows stomach emptying and keeps the protein working longer.",
      "Most people get about half the fiber they need — 15g vs. a 28g daily value.",
    ],
    objections: [
      { q: "I'm sick of chewing lettuce.", a: "Stop eating lettuce — it's the worst-tasting vegetable and somehow the default. Roast broccoli until it chars." },
      { q: "Vegetables go bad before I eat them.", a: "Frozen, genuinely — picked and frozen at peak, they don't rot while you feel guilty." },
      { q: "Half a plate is impossible at a restaurant.", a: "Order a vegetable side and eat it before the entrée arrives." },
    ],
    hardSituations: [
      { situation: "As a guest", tip: "Bring a large, genuinely good vegetable dish — guaranteed something works for you." },
      { situation: "Fast food", tip: "Most chains have a side salad or apple slices — not the point of the meal, but it changes its shape." },
    ],
  },
  {
    id: "sugar",
    order: 4,
    name: "Sugar You Chose",
    tagline: "2:40pm, three donuts later, and you feel worse than before.",
    cue: "You're buying packaged food, or an unplanned sweet thing is in front of you.",
    routine: "Check the label / pause and decide deliberately.",
    reward: "The afternoon crash stops, and food starts tasting like more than sweet.",
    triggerSentence: "Before I buy a packaged food, I read the first three ingredients.",
    whyItWorks: [
      "Refined sugar spikes blood sugar fast, insulin overshoots on the way down, and the crash sends you looking for more sugar — a loop.",
      "Concentrated sweetness dulls the reward response over time, so it takes more to get the same satisfaction.",
      "Start with a 7-10 day no-added-sugar reset — cravings fade only once the loop actually breaks.",
    ],
    objections: [
      { q: "I need sugar for energy.", a: "You need glucose, and your body makes it perfectly well from what you're already eating." },
      { q: "Everything has sugar in it.", a: "Whole foods don't — meat, fish, eggs, vegetables, fruit, plain dairy, nuts, beans, rice, potatoes." },
    ],
    hardSituations: [
      { situation: "Parties", tip: "The sugar is mostly in the drinks — sparkling water with lime does the job." },
      { situation: "Holidays and birthdays", tip: "Eat the cake. Choose it, enjoy it, go back to your defaults next meal — not next Monday." },
    ],
  },
  {
    id: "movement",
    order: 5,
    name: "Movement, Not Workouts",
    tagline: "Nine sedentary hours can't be undone by 45 brutal gym minutes.",
    cue: "You finish a meal.",
    routine: "Ten minutes of walking, plus 8,000 steps most days.",
    reward: "You feel clearer and less heavy within twenty minutes.",
    triggerSentence: "After I finish lunch, I walk for ten minutes.",
    whyItWorks: [
      "Walking costs nothing to recover from — you can do it daily, forever, without accumulating fatigue.",
      "Unstructured daily movement varies enormously between people — often the largest lever on daily energy expenditure.",
      "A walk after a meal measurably blunts the post-meal blood-sugar spike.",
    ],
    objections: [
      { q: "8,000 isn't much, shouldn't I do more?", a: "A 31-study review found 7,000 steps/day meaningfully lowers risk across the board. 8,000 sits just above where most benefit lands and is still realistic." },
      { q: "My knees / my back.", a: "Walk shorter and more often — three ten-minute walks instead of one long one." },
    ],
    hardSituations: [
      { situation: "Bad weather", tip: "Mall, big-box store, stairwell, treadmill, laps indoors." },
      { situation: "Packed days", tip: "Three ten-minute walks beat one missed hour." },
    ],
  },
  {
    id: "carbs",
    order: 6,
    name: "Slower Carbs",
    tagline: "The problem was never the carb — it was the type and the amount.",
    cue: "You're choosing or serving a starch.",
    routine: "Pick a complex one, and keep it to a quarter of the plate.",
    reward: "Stable energy through the afternoon, with no crash to manage.",
    triggerSentence: "When I serve a starch, it's a whole one, and it covers a quarter of the plate.",
    whyItWorks: [
      "Refined carbs are absorbed quickly; the fiber in complex carbs acts as a brake, delivering the same fuel over hours instead of minutes.",
      "Refined carbs also bind a meaningful amount of water — much of the \"feeling less puffy\" here is exactly that.",
      "The finished plate — ½ vegetables, ¼ protein, ¼ complex carb — is close to USDA MyPlate. Nothing exotic; what's new is arriving there one habit at a time.",
    ],
    objections: [
      { q: "Shouldn't I just cut carbs entirely?", a: "You can lose weight that way, but most people can't sustain it and feel flat. This book is built around what you'll still be doing in three years." },
    ],
    hardSituations: [
      { situation: "The holiday table", tip: "One-carb rule: pick ONE carbohydrate at any meal. Choose the one you actually love." },
      { situation: "Sandwiches and pizza", tip: "Open-faced, or one slice with a large salad — volume from vegetables, not more bread." },
    ],
  },
  {
    id: "fat",
    order: 7,
    name: "Fat You Can See",
    tagline: "A 900-calorie salad, and not one calorie came from the chicken.",
    cue: "You're adding fat to something — pan, salad, bowl, toast.",
    routine: "It comes out of a spoon, not a bottle or a jar.",
    reward: "You keep eating exactly what you were eating, and the plate looks identical.",
    triggerSentence: "When I add fat, it comes out of a measuring spoon.",
    whyItWorks: [
      "One tablespoon of oil is about 120 calories — roughly two slices of bread — and it barely registers as food.",
      "Fat is essential (hormones, vitamin absorption, brain function) — this isn't about eating less of it, just knowing how much.",
      "Run one strict week of measuring everything to calibrate your eye — a skill you keep permanently after.",
    ],
    objections: [
      { q: "But healthy fats are good for you.", a: "They are — and also 120 calories a tablespoon. \"Healthy\" describes what a food does for your body, not how much energy it has." },
      { q: "Low-fat products, then?", a: "Usually not — manufacturers typically replace removed fat with sugar or starch." },
    ],
    hardSituations: [
      { situation: "Restaurants", tip: "Dressing on the side, always. Dip the fork instead of pouring." },
      { situation: "The things poured on top", tip: "Ranch, queso, aioli, mayo-based sides — an appetizer of chips and dip can outweigh the entrée." },
    ],
  },
  {
    id: "pause",
    order: 8,
    name: "The Ten-Second Pause",
    tagline: "9:40pm, standing in front of an open cabinet, no idea what you're looking for.",
    cue: "You're about to eat something outside a planned meal.",
    routine: "Stop, count to ten, and name what's actually happening.",
    reward: "You stop losing arguments you didn't know you were having.",
    triggerSentence: "Before I eat anything unplanned, I stop and count to ten.",
    whyItWorks: [
      "Eating for comfort is a normal human mechanism, not a moral failure — the goal isn't to stop feeling, it's to stop responding automatically.",
      "Naming an emotional state out loud engages a different part of the brain than the one running the urge, and reliably reduces its intensity.",
      "This is last on purpose — it's the hardest habit, and much easier once the other seven have removed the false alarms.",
    ],
    objections: [
      { q: "Ten seconds won't stop me when I really want something.", a: "It's not designed to stop you — it's designed to make the eating conscious. Conscious eating is smaller, slower, and doesn't carry the regret that drives the next episode." },
      { q: "Isn't it better to just not keep junk in the house?", a: "Environment helps and you should do it — but you can't control every environment, and this skill travels with you." },
    ],
    hardSituations: [
      { situation: "The five-minute substitution", tip: "A short walk, ten slow breaths, cold water on your face, brushing your teeth. Still hungry after five minutes? Eat, no argument." },
    ],
  },
];

export function getHabit(id: string): Habit | undefined {
  return HABITS.find((h) => h.id === id);
}

export function getHabitByOrder(order: number): Habit | undefined {
  return HABITS.find((h) => h.order === order);
}

export type HabitProgressMap = Record<string, { startedAt: string; installedAt?: string }>;

/** The habit currently being worked on — started but not yet installed,
 * highest order among those. undefined if all 8 are installed. */
export function getCurrentHabit(progress: HabitProgressMap | undefined): Habit | undefined {
  if (!progress) return undefined;
  const inProgress = HABITS.filter((h) => progress[h.id]?.startedAt && !progress[h.id]?.installedAt);
  return inProgress.sort((a, b) => b.order - a.order)[0];
}

export function allHabitsInstalled(progress: HabitProgressMap | undefined): boolean {
  return HABITS.every((h) => !!progress?.[h.id]?.installedAt);
}

/** The book's own automaticity benchmark (Lally et al., UCL) — shown as an
 * expectation-setter, not a deadline. */
export const AUTOMATICITY_MEDIAN_DAYS = 66;
export const AUTOMATICITY_RANGE_DAYS: [number, number] = [18, 254];

/** Chapter 3's exact recovery trigger: current weight + this many lb. */
export const DRIFT_TRIGGER_LB = { min: 5, max: 7 };
