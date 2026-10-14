/**
 * Content for "book mode" — the companion experience for Shai's book
 * "One Habit at a Time: The Eight-Habit Method for Losing Weight Without
 * Dieting." Source: ~/Downloads/ONE-HABIT-AT-A-TIME-final-EN.md.
 *
 * English (HABITS, imperial, Amazon US) and Hebrew (HABITS_HE, metric, the
 * Israeli edition). This is the single source of truth for both the habits UI
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
  /** Instruction for the meal-photo AI: what to look for in a plate for this habit. */
  mealLens: string;
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
    mealLens: "Look for a glass of water (or any drink) next to the plate. Do not judge the food itself. If there is no glass in the photo, gently remind them of the trigger sentence.",
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
    mealLens: "Identify the protein source on the plate and estimate its grams of protein. Note whether the meal looks built around it, and give one concrete way to add or move up protein if not.",
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
    mealLens: "Estimate what fraction of the plate is covered by vegetables (target: about half) and give one concrete way to get closer.",
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
    mealLens: "Point out any visible added sugar: sweet drinks, desserts, sweetened sauces or packaged items. Encourage a deliberate choice, never guilt; eating it on purpose is fine.",
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
    mealLens: "Movement is not visible in a meal photo. Keep the tip short and suggest the ten-minute walk after this meal.",
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
    mealLens: "Identify the starchy item, whether it looks whole or refined, and estimate how much of the plate it takes (target: about a quarter). Give one concrete swap or portion tweak.",
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
    mealLens: "Spot added fat: oil, dressing, nuts, spreads, fried items. Estimate the calories it adds and suggest measuring it with a spoon, not cutting it out.",
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
    mealLens: "If this looks like unplanned eating (a snack, grazing), suggest a ten-second pause and one question: physical hunger, or something else? No guilt. For a normal planned meal, keep the tip brief.",
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

/**
 * Hebrew edition ("הרגל אחד בכל פעם") — drawn from the Hebrew book's own text
 * (C:\Users\shay\OneHabit-book-build, blocks.json), which is an Israeli
 * adaptation rather than a literal translation: metric units, a 7,000-step
 * reference (not 8,000), Israeli foods and the Eran helpline. Same ids/order
 * as HABITS so habitProgress works across both.
 */
export const HABITS_HE: Habit[] = [
  {
    id: "water",
    order: 1,
    name: "מים לפני האוכל",
    tagline: "אולי הייתם רעבים, אולי צמאים, אולי המטבח היה פשוט ההפסקה הקרובה ביותר.",
    cue: "אתם עומדים להתחיל ארוחת בוקר, צהריים או ערב.",
    routine: "שותים כוס מים מלאה לפני הביס הראשון.",
    reward: "העצירה הופכת את תחילת הארוחה למודעת יותר. שימו לב אם היא גם משנה את תחושת הרעב.",
    triggerSentence: "לפני כל ארוחה עיקרית שותים כוס מים מלאה.",
    mealLens: "חפשו כוס מים או משקה ליד הצלחת. אל תשפטו את האוכל עצמו. אם אין כוס בתמונה, הזכירו בעדינות את משפט ההפעלה.",
    whyItWorks: [
      "מים מוסיפים נפח לפני הארוחה, ועשויים לעזור לחלק מהאנשים להגיע אליה פחות רעבים.",
      "כוס מים נותנת לכם עשר שניות שבהן אינכם אוכלים על טייס אוטומטי - זמן לשאול: האם זה רעב אמיתי, או רק דחף רגעי?",
      "ההרגל קטן מספיק כדי לחזור עליו בזמן שלומדים את השיטה. הצלחה מוקדמת חשובה יותר משבוע ראשון מרשים.",
    ],
    objections: [
      { q: "זה אומר שנבלה כל היום בשירותים.", a: "ייתכן שתתנו שתן לעתים קרובות יותר כשתשתו יותר. פזרו את השתייה לאורך היום ואל תמשיכו להגדיל את הכמות רק כדי להגיע למספר מסוים." },
      { q: "אנחנו לא אוהבים את הטעם של מים.", a: "לימון, נענע, מלפפון או פירות יער קפואים. גם חליטת צמחים נחשבת, חמה או קרה. עדיף משקאות לא ממותקים." },
      { q: "אנחנו שותים הרבה קפה. זה לא מספיק?", a: "קפה אכן תורם נוזלים. המשיכו לשתות אותו אם הוא מתאים לכם, והשאירו את המים עצמם כסימן הגלוי של ההרגל." },
      { q: "זה נראה קטן מדי מכדי לשנות משהו.", a: "בדיוק. ההרגל הראשון קטן מספיק כדי לחזור עליו בזמן שלומדים את השיטה." },
    ],
    hardSituations: [
      { situation: "מסעדות", tip: "שתו כוס מים לפני שמגיע האוכל הראשון. המשיכו לשתות כרגיל במהלך הארוחה - יותר אינו בהכרח טוב יותר." },
      { situation: "שתיית אלכוהול", tip: "מים לסירוגין עם אלכוהול עשויים להאט את קצב השתייה. זה אינו מבטל את השפעות האלכוהול על שיקול הדעת, השינה או הבטיחות." },
      { situation: "נסיעות", tip: "עברו את הבידוק הביטחוני עם בקבוק ריק ומלאו אותו לאחר מכן." },
    ],
  },
  {
    id: "protein",
    order: 2,
    name: "קודם חלבון",
    tagline: "בצהריים עשיתם הכול כמו שצריך, ובשעה 15:15 אתם כבר מחטטים במטבחון כאילו לא אכלתם מאז יום שלישי.",
    cue: "אתם עומדים להכין ארוחה או להזמין אותה.",
    routine: "השאלה הראשונה היא \"איפה החלבון שלי?\". את כל היתר מחליטים אחר כך.",
    reward: "בניתם את הארוחה סביב עוגן ברור. השוו את תחושת הרעב שלכם כעבור כמה שעות.",
    triggerSentence: "לפני שמחליטים על כל דבר אחר בארוחה, בוחרים את מקור החלבון.",
    mealLens: "זהו את מקור החלבון בצלחת והעריכו כמה גרם חלבון יש בו. ציינו אם הארוחה נראית בנויה סביבו, ואם לא - תנו דרך קונקרטית אחת להוסיף או להקדים חלבון.",
    whyItWorks: [
      "חלבון מסייע לשמור על רקמה רזה במהלך הירידה במשקל, אך אינו מבטיח שכל קילוגרם שיירד יהיה שומן בלבד.",
      "ארוחה שבנויה סביב חלבון בדרך כלל משביעה יותר, אם כי ההשפעה משתנה מאדם לאדם.",
      "אם אתם נוטלים תרופה ממשפחת GLP-1, שוחחו על צריכת החלבון עם הגורם המטפל.",
    ],
    objections: [
      { q: "אני לא מרים משקולות, אז אני לא צריך הרבה חלבון.", a: "חלבון אינו מיועד רק לחדר הכושר. הוא מספק חומצות אמינו שהגוף משתמש בהן לאורך היום." },
      { q: "אני לא אוכל בשר.", a: "זה דורש יותר תכנון, לא פחות חלבון: יוגורט יווני, קוטג', ביצים, עדשים, שעועית, טופו, טמפה, אדממה ואבקות חלבון." },
      { q: "חלבון יקר.", a: "מקורות זולים יחסית: ביצים, טונה בשימורים, ירכי עוף, קוטג', עדשים יבשות, שעועית וטופו." },
      { q: "אני לא מסוגל לאכול כל כך הרבה.", a: "פזרו את החלבון על פני הארוחות שאתם כבר אוכלים, במקום להשלים הכול בארוחת הערב." },
    ],
    hardSituations: [
      { situation: "במסעדה", tip: "קודם בחרו חלבון - בקר, עוף, דג או ביצים בארוחת בראנץ'. אחר כך בחרו תוספות." },
      { situation: "במנגל", tip: "התחילו במה שירד מהאש, ואחר כך בחרו את התוספות שאתם באמת רוצים." },
      { situation: "באירוח אצל אחרים", tip: "התחילו בחלבון, אם זה מתאים. כשהמנה העשירה בפחמימות תגיע, תוכלו לבחור כשאתם פחות מורעבים." },
      { situation: "נסיעות ויום עמוס", tip: "שייקר ומנת אבקת חלבון יכולים להיות גיבוי נוח בשדה תעופה או ביום שהתגלגל אחרת מהמתוכנן." },
    ],
  },
  {
    id: "half-plate",
    order: 3,
    name: "חצי צלחת",
    tagline: "אפשר לסיים מנה קטנה במסעדה ועדיין להרגיש שכמעט לא אכלתם. ההבדל אינו משמעת עצמית, אלא מה שתופס את המקום.",
    cue: "צלחת ריקה ביד.",
    routine: "ממלאים את מחציתה בירקות.",
    reward: "לצלחת יש מבנה ברור. שימו לב עד כמה אתם שבעים בנוחות בסוף הארוחה.",
    triggerSentence: "כשמרכיבים צלחת, הירקות מכסים חצי ממנה.",
    mealLens: "העריכו איזה חלק מהצלחת מכוסה בירקות (היעד: בערך חצי) ותנו דרך קונקרטית אחת להתקרב לכך.",
    whyItWorks: [
      "מנה גדולה של ירקות תופסת בדרך כלל יותר נפח תמורת פחות קלוריות.",
      "סיבים מוסיפים מבנה ונפח, כך שהצלחת מרגישה כמו ארוחה ולא כמו קצבה.",
      "הצלחת שאתם בונים: חצי ירקות, רבע חלבון, רבע פחמימה. ההרגל הבא יתייחד לפחמימה.",
    ],
    objections: [
      { q: "אני לא ארנב. נמאס לי ללעוס חסה.", a: "אז הפסיקו להכריח את עצמכם לאכול חסה. צלו ברוקולי ב־220 מעלות עד שהקצוות משחימים, הקפיצו שעועית ירוקה, הוסיפו שום, לימון או רוטב חריף. זו בעיה של בישול, לא של משמעת עצמית." },
      { q: "הירקות מתקלקלים לפני שמספיקים לאכול אותם.", a: "קפואים. באמת. הם נוחים, מזינים ואינם נרקבים בזמן שאתם מרגישים אשמים בגללם." },
      { q: "סלט לא משביע אותי.", a: "קערת עלים אולי לא. בנו את הארוחה סביב ירקות בעלי מרקם צפוף יותר והוסיפו חלבון: דלעת צלויה, כרובית, פלפלים, פטריות ושעועית." },
      { q: "חצי צלחת במסעדה זה בלתי אפשרי.", a: "הזמינו תוספת ירקות ואכלו אותה לפני המנה העיקרית. שאלו אם אפשר להחליף צ'יפס בירקות נוספים." },
    ],
    hardSituations: [
      { situation: "כשמתארחים", tip: "הביאו מנת ירקות שתשמחו לאכול בעצמכם. כך יש על השולחן משהו שמתאים לכם." },
      { situation: "כשמארחים", tip: "צלו כמות כפולה מהרגיל והגישו אותה ראשונה, בזמן שכולם עוד עומדים ומדברים." },
      { situation: "מזון מהיר", tip: "כשיש סלט קטן, ירקות או פלחי תפוח, בחרו בהם. הם אולי אינם העיקר, אבל משנים את מבנה הארוחה." },
    ],
  },
  {
    id: "sugar",
    order: 4,
    name: "סוכר שבחרתם",
    tagline: "14:40. מישהו השאיר סופגניות במטבח, אתם אוכלים אחת, ועשרים דקות אחר כך מתחשק לכם עוד אחת. זה לא פגם באופי, זו לולאה.",
    cue: "אתם עומדים לאכול או לשתות משהו שמכיל סוכר מוסף.",
    routine: "עוצרים ומחליטים אם אתם באמת רוצים אותו.",
    reward: "הסוכר הופך לבחירה במקום לרעש רקע.",
    triggerSentence: "לפני שאוכלים או שותים משהו עם סוכר מוסף, מחליטים אם באמת רוצים אותו.",
    mealLens: "ציינו סוכר מוסף שנראה בתמונה: משקאות ממותקים, קינוחים, רטבים מתוקים או מוצרים ארוזים ממותקים. עודדו בחירה מודעת, בלי אשמה; אכילה מתוך בחירה היא בסדר גמור.",
    whyItWorks: [
      "העניין הוא שאתם מחליטים, לא שאתם \"נקיים\" או \"חוטאים\". השאלה היא: \"האם בחרתי בזה, או שזה פשוט קרה לי?\"",
      "מאכלים מתוקים קלים לאכילה, מלווים בהמון סימנים מעוררים וזמינים דווקא כשהקשב שלנו נמוך. חזרה על הפעולה יכולה לבנות לולאה.",
      "סוכר מוסף אינו מקור אמין לאנרגיית חירום. אם תרצו, אפשר לנסות שבעה ימים ללא סוכר מוסף שנאכל באופן שגרתי, כדי לראות היכן מתיקות נכנסת לחיים באופן אוטומטי.",
    ],
    objections: [
      { q: "אני חייב סוכר בשביל אנרגיה.", a: "פחמימות הן מקור אנרגיה, אבל סוכר מוסף אינו פתרון אמין לעייפות. אם העייפות תכופה או קשה, צריך לבדוק אותה במקום לטפל בה שוב ושוב באוכל." },
      { q: "ומה עם ממתיקים מלאכותיים?", a: "אפשר לצרוך אותם או לוותר עליהם. אין בסיס לטענה שיומיים ללא סוכר \"מכוונים מחדש\" את חוש הטעם." },
      { q: "יש סוכר בהכול.", a: "מאכלים רבים שעברו עיבוד מינימלי אינם מכילים סוכר מוסף: בשר, דגים, ביצים, ירקות, פירות, מוצרי חלב טבעיים, אגוזים, שעועית, אורז ותפוחי אדמה. במזונות ארוזים התווית חשובה." },
    ],
    hardSituations: [
      { situation: "במסיבות", tip: "קל לפספס סוכר מוסף במשקאות, במיוחד בקוקטיילים ובתערובות מתוקות. מים מוגזים עם ליים הם חלופה פשוטה." },
      { situation: "בחגים ובימי הולדת", tip: "בשביל זה בדיוק קיים \"סוכר שבחרתם\". אכלו את העוגה. בחרו בה, תיהנו, וחזרו להרגלים הקבועים בארוחה הבאה, לא ביום שני הבא." },
      { situation: "סופגניות במשרד", tip: "זו בעיית סביבה, לא בעיית כוח רצון. אל תעמדו לידן." },
    ],
  },
  {
    id: "movement",
    order: 5,
    name: "תנועה, לא אימונים",
    tagline: "תשע שעות ישיבה, ואז 45 דקות קשות בחדר הכושר מתוך אשמה. אימון לא מוחק את שאר היום.",
    cue: "מסיימים ארוחה שאתם אוכלים בקביעות. עבור רבים, ארוחת הצהריים מתאימה.",
    routine: "הולכים עשר דקות.",
    reward: "ההליכה הושלמה. שימו לב איך הגוף והראש מרגישים אחריה.",
    triggerSentence: "אחרי ארוחת הצהריים יוצאים להליכה של עשר דקות.",
    mealLens: "תנועה אינה נראית בתמונת ארוחה. שמרו על טיפ קצר והציעו הליכה של עשר דקות אחרי הארוחה הזו.",
    whyItWorks: [
      "הליכה דורשת לרוב פחות התאוששות מאימון קשה ואפשר לחלק אותה למקטעים קצרים, ולכן קל לחזור עליה.",
      "הליכה לאחר ארוחה יכולה לסייע לתגובת הסוכר לאחריה, אך אינה הופכת הליכה של עשר דקות לטיפול בסוכרת.",
      "תנועה יומיומית מצטברת וקוטעת שעות ישיבה. כשההליכה יציבה, אפשר להתקדם בהדרגה לכיוון 7,000 צעדים ברוב הימים.",
    ],
    objections: [
      { q: "אין לי זמן ללכת.", a: "אם אתם כבר משוחחים בטלפון, נסו לעשות שיחה אחת בעמידה או בהליכה. חברו תנועה לזמן שאתם ממילא משתמשים בו." },
      { q: "7,000 צעדים זה לא הרבה. לא כדאי יותר?", a: "כ־7,000 צעדים ביום נקשרו לסיכון נמוך יותר בכמה מדדי בריאות, ובחלקם נצפתה תועלת גם מעל. עשו יותר אם זה מתאים לכם - זו נקודת ייחוס, לא תקרה." },
      { q: "בהליכה לא שורפים הרבה קלוריות.", a: "שריפת קלוריות אינה הסיבה היחידה ללכת. תנועה קבועה קוטעת שעות ישיבה, ולעיתים קל יותר להתמיד בה מאשר באימון קשה." },
      { q: "הברכיים שלי. הגב שלי.", a: "הליכות קצרות ותכופות עשויות להתאים יותר מהליכה ארוכה אחת. אם הכאב מגביל אתכם, פנו לפיזיותרפיה ולא להתעקש להמשיך למרות הכאב." },
    ],
    hardSituations: [
      { situation: "מזג אוויר גרוע", tip: "קניון, חנות גדולה, חדר מדרגות, מסילה או הליכה בבית. ההרגל הוא ההליכה, לא הנוף." },
      { situation: "ימים עמוסים באמת", tip: "חלקו את התנועה למקטעים קצרים במקום לחכות לשעה פנויה שאולי לא תגיע." },
      { situation: "נסיעות", tip: "לכו בטרמינל במקום לשבת ליד השער. במלונות יש מדרגות." },
    ],
  },
  {
    id: "carbs",
    order: 6,
    name: "פחמימות שמתעכלות לאט יותר",
    tagline: "מתישהו הפכה המילה \"פחמימות\" למילה גסה. פחמימה אינה מזון אחד, וגם אינה תוצאה בריאותית אחת.",
    cue: "בוחרים או מגישים מזון עמילני.",
    routine: "בוחרים אפשרות עשירה יותר בסיבים ופחות מעובדת, בכמות של כרבע מהצלחת.",
    reward: "לצלחת יש מבנה ברור. השוו את האנרגיה והרעב שלכם אחרי הארוחה.",
    triggerSentence: "כשמגישים מזון עמילני, בוחרים באפשרות עשירה יותר בסיבים ושומרים על כמות של כרבע מהצלחת.",
    mealLens: "זהו את המזון העמילני, אם נראה מלא או מעובד, והעריכו כמה מהצלחת הוא תופס (היעד: בערך רבע). תנו החלפה או התאמת כמות קונקרטית אחת.",
    whyItWorks: [
      "הסוג, הכמות ושאר מרכיבי הארוחה כולם חשובים, לא רק השאלה \"פחמימות כן או לא\".",
      "מקורות פחמימה איכותיים נוטים להביא איתם גם סיבים ורכיבי תזונה.",
      "הצלחת המוגמרת: חצי ירקות, רבע חלבון, רבע פחמימה מורכבת. אין בה דבר אקזוטי - הגעתם אליה הרגל אחרי הרגל.",
    ],
    objections: [
      { q: "לא עדיף פשוט לוותר על פחמימות לגמרי?", a: "יש אנשים שמעדיפים תזונה דלת פחמימות ואחרים לא. הספר משתמש בברירת מחדל מתונה, שמשאירה מקום לשעועית, לפירות, לדגנים שלמים ולארוחות משפחתיות רגילות." },
      { q: "רבע צלחת זו כמעט לא ארוחה.", a: "זו נקודת התחלה חזותית, לא הוראה שקולה בגרמים. רעב, מבנה גוף, עומס אימונים ושאר הארוחה יכולים להצדיק יותר או פחות." },
      { q: "בטטה תמיד טובה יותר מתפוח אדמה לבן, לא?", a: "לא. סוג, שיטת הכנה, כמות ושאר הארוחה חשובים. בחרו את מה שאתם אוהבים ושמרו על מבנה הצלחת." },
      { q: "ומה בימי אימון?", a: "אימונים עשויים לשנות את צורכי הפחמימות. הצלחת הזאת היא ברירת מחדל, לא תוכנית תזונת ספורט מותאמת אישית." },
    ],
    hardSituations: [
      { situation: "שולחן שישי או חג", tip: "כלל הפחמימה האחת: בכל ארוחה בחרו פחמימה אחת. חלה, אורז, קוגל, קובה או פשטידה - בחרו את מה שאתם באמת אוהבים, ודלגו על השאר." },
      { situation: "כריכים ופיצה", tip: "נסו כריך פתוח, או שלבו את מנת הפיצה שאתם רוצים עם סלט גדול. תנו לירקות לספק חלק מהנפח." },
    ],
  },
  {
    id: "fat",
    order: 7,
    name: "לראות את השומן",
    tagline: "אתם מזמינים סלט: עוף בגריל, עלים, אבוקדו, אגוזים, זיתים ורוטב. הוא יכול להיות צפוף באנרגיה הרבה יותר ממה שנדמה.",
    cue: "אתם מוסיפים שומן למחבת, לסלט, לקערה או לפרוסת לחם.",
    routine: "מודדים אותו במקום למזוג או לקחת ללא מדידה.",
    reward: "ממשיכים ליהנות מהמאכלים שאוהבים, אבל הכמות גלויה לעין.",
    triggerSentence: "כשמוסיפים שומן, משתמשים בכף מדידה.",
    mealLens: "זהו שומן מוסף: שמן, רוטב, אגוזים, מרחים, מטוגן. העריכו כמה קלוריות הוא מוסיף והציעו למדוד אותו בכף ולא לוותר עליו.",
    whyItWorks: [
      "כף אחת של שמן זית מכילה כ־119 קלוריות, ושמן כמעט לא מוסיף נפח לארוחה, ולכן קל לא לשים לב.",
      "שומן חיוני לגוף ועוזר לו לספוג ויטמינים מסיסים בשומן. המטרה היא לראות את הכמות, לא לבטל את השומן.",
      "אפשר לנסות שבוע של מדידת כל השומנים שמוסיפים למזון, ולהשוות בסופו את ההערכה בעין לכף המדידה.",
    ],
    objections: [
      { q: "אבל שומנים בריאים טובים לנו.", a: "בהחלט, הם יכולים להשתלב בתזונה בריאה. הם גם צפופים באנרגיה: בשמנים נפוצים יש בערך 120 קלוריות בכף. סוג השומן לא מבטל את הצורך לשים לב לכמות." },
      { q: "למדוד הכול זה מתיש.", a: "התחילו בשבוע אחד. אחר כך השוו מדי פעם את ההערכה בעין לכף, ובדקו מחדש כשהמנות מתחילות לגדול." },
      { q: "חשבתי ששומן לא משמין.", a: "אין רכיב תזונה יחיד שגורם באופן בלעדי לעלייה במשקל. שמן, רוטב, מיונז וחמאת אגוזים יכולים להוסיף הרבה אנרגיה בלי לשנות כמעט את גודל הארוחה." },
      { q: "אז מוצרים דלי שומן?", a: "לפעמים. השוו שתי תוויות אמיתיות: קלוריות, סוכר מוסף, חלבון, גודל מנה, ומה טעים לכם מספיק כדי שתאכלו ממנו בכמות שמתאימה לכם." },
    ],
    hardSituations: [
      { situation: "מה שמוזגים על האוכל", tip: "טחינה בנדיבות, מטבלי גבינה, איולי, רטבים שמנתיים ומטבלים במסעדות משנים במהירות את כמות האנרגיה בארוחה, אף שקל לפספס אותם." },
      { situation: "במסעדות", tip: "בקשו את הרוטב בצד כשאתם רוצים לשלוט בכמות. טבלו, מדדו בכף או מזגו בכוונה." },
      { situation: "במנגל", tip: "החליטו אילו תוספות ומטבלים שמנתיים אתם באמת רוצים, והגישו לעצמכם מנה במקום לנשנש מהשולחן." },
    ],
  },
  {
    id: "pause",
    order: 8,
    name: "עצירה של עשר שניות",
    tagline: "21:40. הילדים ישנים, הכלים מסודרים, ותוך ארבע דקות אתם מול ארון פתוח ולא מצליחים להסביר מה אתם מחפשים.",
    cue: "אתם עומדים לאכול משהו מחוץ לארוחה שתוכננה.",
    routine: "עוצרים, סופרים עד עשר ומזהים מה באמת מתרחש.",
    reward: "מפסיקים להפסיד בוויכוחים פנימיים שלא ידעתם שאתם מנהלים.",
    triggerSentence: "לפני שאוכלים משהו שלא תוכנן, עוצרים וסופרים עד עשר.",
    mealLens: "אם נראה שזו אכילה מחוץ לארוחה מתוכננת (חטיף, נשנוש), הציעו עצירה של עשר שניות ושאלה אחת: רעב גופני או צורך אחר? בלי אשמה. בארוחה מתוכננת רגילה - טיפ קצר.",
    whyItWorks: [
      "אכילה לשם נחמה היא תופעה נפוצה, לא כישלון מוסרי. המטרה אינה להפסיק להרגיש, אלא להפסיק להגיב באופן אוטומטי.",
      "בעשר השניות שאלו: \"האם זה רעב גופני, או צורך בנחמה, בהפסקה או במשהו לעשות?\" ואז בחרו. אם זה רגש, תנו לו שם.",
      "זה ההרגל האחרון בכוונה: שבעת ההרגלים האחרים נותנים לארוחות מבנה, וכך לעצירה נשאר פחות לעשות.",
    ],
    objections: [
      { q: "אני לא אוכל רגשית, אני פשוט אוהב אוכל.", a: "נסו לעצור במשך שלושה ימים לפני שתחליטו. רבים מגלים משהו על הערבים שלהם שלא הבחינו בו קודם." },
      { q: "עשר שניות לא יעצרו אותי כשממש מתחשק לי.", a: "הן לא אמורות לעצור אתכם. הן אמורות להפוך את הבחירה למודעת. גם כשבוחרים באותו מאכל, מפסיקים לרגע את הטייס האוטומטי." },
      { q: "לא עדיף להוציא מהבית מאכלים שמפתים אותי?", a: "שינוי הסביבה יכול לעזור. אבל אי אפשר לשלוט בכל סביבה שנכנסים אליה, והמיומנות הזאת הולכת איתכם." },
    ],
    hardSituations: [
      { situation: "תחליף לחמש דקות", tip: "הליכה קצרה, עשר נשימות איטיות, מים קרים על הפנים, הודעה למישהו, צחצוח שיניים. עדיין רוצים לאכול אחרי חמש דקות? אפשר, בלי ויכוח." },
      { situation: "אם זה יותר מזה", tip: "אכילה תכופה מעבר לאי נוחות, אכילה בסתר, תחושת אובדן שליטה או בושה עזה לאחריה - כדאי לקבל תמיכה מקצועית. בשעת מצוקה אפשר לפנות לער״ן בטלפון 1201 (חינם, בכל שעות היממה)." },
    ],
  },
];

export type HabitLang = "he" | "en";

export function habitsFor(lang?: string): Habit[] {
  return lang === "he" ? HABITS_HE : HABITS;
}

export function getHabit(id: string, lang?: string): Habit | undefined {
  return habitsFor(lang).find((h) => h.id === id);
}

export function getHabitByOrder(order: number, lang?: string): Habit | undefined {
  return habitsFor(lang).find((h) => h.order === order);
}

export type HabitProgressMap = Record<string, { startedAt: string; installedAt?: string }>;

/** The habit currently being worked on — started but not yet installed,
 * highest order among those. undefined if all 8 are installed. */
export function getCurrentHabit(progress: HabitProgressMap | undefined, lang?: string): Habit | undefined {
  if (!progress) return undefined;
  const inProgress = habitsFor(lang).filter((h) => progress[h.id]?.startedAt && !progress[h.id]?.installedAt);
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
