// Curated daily prompts for the wing
// Each prompt has a Hebrew and English version, paired by index.
// Selection: rotates daily based on day-of-year, so all wing members see the same prompt.

const promptsHe = [
  "מה הניצחון הקטן שלך מהיום?",
  "מה הדבר הכי בריא שאכלת השבוע?",
  "מה הכי קשה לך בתוכנית עכשיו?",
  "שתפו טיפ שעובד לכם",
  "מה היעד שלך לשבוע הקרוב?",
  "מה השתפר אצלך מאז שהתחלת?",
  "איזה מאכל אתה הכי מתגעגע אליו?",
  "מה הספורט שאתה הכי אוהב לעשות?",
  "כמה שעות ישנת אתמול?",
  "מה הדבר שגורם לך הכי הרבה לאכול שלא ברעב?",
  "איזו שעה אתה הכי מתפתה לנשנוש?",
  "מה הכי עזר לך לעמוד בפיתויים השבוע?",
  "איזה מתכון חדש תרצה לנסות?",
  "תארו את הבוקר האידיאלי שלכם",
  "מה גורם לך לזוז יותר?",
  "מה היה הרגע הכי מעצים שלך החודש?",
  "איזה הרגל אחד היית רוצה לבסס?",
  "מי האדם שהכי תומך בך במסע?",
  "איך אתה חוגג ניצחונות קטנים?",
  "איזה משקה אתה הכי שותה לאורך היום?",
  "מה הספר/פודקאסט שהכי השפיע עליך?",
  "מה היית עושה אחרת אם היית מתחיל מחדש?",
  "איזו אכזבה לימדה אותך הכי הרבה?",
  "מה אתה אוכל לארוחת בוקר ברוב הימים?",
  "מה הספורט שהכי לא היית מצפה לעצמך לאהוב?",
  "איך אתה מנהל ימי לחץ באוכל?",
  "מה הדבר שאתה הכי גאה בו עד עכשיו?",
  "איזה ירק אתה הכי אוהב ואיך אתה אוכל אותו?",
  "מה היית מייעץ למי שמתחיל היום?",
  "איזה רגע השבוע הזכיר לך למה התחלת?",
  "מה הקושי האחרון שעברת והצלחת לעבור?",
  "מה אתה עושה בערב כדי לישון טוב?",
];

const promptsEn = [
  "What's your small win for today?",
  "What's the healthiest thing you ate this week?",
  "What's hardest for you right now in the program?",
  "Share a tip that works for you",
  "What's your goal for the coming week?",
  "What's improved since you started?",
  "Which food do you miss the most?",
  "What's your favorite type of workout?",
  "How many hours did you sleep last night?",
  "What makes you eat when you're not hungry?",
  "What time of day are you most tempted to snack?",
  "What helped you resist temptations this week?",
  "Which new recipe would you like to try?",
  "Describe your ideal morning",
  "What gets you moving more?",
  "What was your most empowering moment this month?",
  "Which one habit would you like to build?",
  "Who supports you most on this journey?",
  "How do you celebrate small wins?",
  "What's your most-consumed drink throughout the day?",
  "Which book/podcast has impacted you the most?",
  "What would you do differently if starting over?",
  "Which setback taught you the most?",
  "What do you eat for breakfast most days?",
  "Which workout did you not expect to enjoy?",
  "How do you handle stressful days with food?",
  "What are you most proud of so far?",
  "Which vegetable do you love and how do you prepare it?",
  "What advice would you give someone starting today?",
  "Which moment this week reminded you why you started?",
  "What's the latest challenge you overcame?",
  "What's your evening routine for better sleep?",
];

if (promptsHe.length !== promptsEn.length) {
  throw new Error("Daily prompt lists must have equal length");
}

export const PROMPT_COUNT = promptsHe.length;

/** Get question index for a given date — same for all wing members on the same day. */
export function getPromptIndexForDate(date: Date): number {
  // Use UTC date to avoid timezone drift across wing members in different zones
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff  = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return dayOfYear % PROMPT_COUNT;
}

export function getPromptForDate(date: Date, lang: "he" | "en"): { question: string; questionId: number } {
  const idx = getPromptIndexForDate(date);
  const list = lang === "he" ? promptsHe : promptsEn;
  return { question: list[idx], questionId: idx };
}
