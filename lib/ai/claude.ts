import Anthropic from "@anthropic-ai/sdk";
import type { MealAnalysis } from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 4,
});

export async function analyzeMealImage(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  hint?: string,
  lang: "he" | "en" = "he"
): Promise<MealAnalysis> {
  const isHe = lang === "he";
  const promptText = isHe
    ? `${hint ? `המשתמש מתקן או מוסיף מידע על הארוחה: "${hint}". תן עדיפות לתיקון הזה על פני מה שנראה בתמונה, ועדכן את כל הערכים התזונתיים (כולל הקלוריות) בהתאם.\n\n` : ""}המשתמש נמצא בתהליך ירידה במשקל. אנא נתח את הצלחת בתמונה הזו ותן לי:
1. תיאור קצר של הארוחה בעברית
2. רשימת רכיבים עם משקל משוער בגרמים לכל אחד
3. ערכים תזונתיים: קלוריות, חלבון, פחמימות, שומן, סיבים
4. ציון בריאותי מ-1 עד 10
5. טיפ קצר בעברית לשיפור הארוחה (אופציונלי)

ענה אך ורק ב-JSON תקני בפורמט הבא, ללא טקסט נוסף:
{
  "description": "תיאור הארוחה",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "items": [
    { "name": "שם הרכיב", "estimatedGrams": 0, "calories": 0 }
  ],
  "healthScore": 7,
  "tips": "טיפ אופציונלי",
  "containsVegetables": false
}`
    : `${hint ? `The user is correcting or adding information about the meal: "${hint}". Prioritize this correction over what's visible in the image, and update all nutritional values (including calories) accordingly.\n\n` : ""}The user is on a weight loss journey. Please analyze the plate in this image and provide:
1. A short description of the meal in English
2. A list of ingredients with estimated weight in grams each
3. Nutritional values: calories, protein, carbs, fat, fiber
4. A health score from 1 to 10
5. A short tip in English to improve the meal (optional)
6. Whether the meal contains vegetables (true/false)

Reply ONLY with valid JSON in the following format, no extra text:
{
  "description": "meal description",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "items": [
    { "name": "ingredient name", "estimatedGrams": 0, "calories": 0 }
  ],
  "healthScore": 7,
  "tips": "optional tip",
  "containsVegetables": false
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          { type: "text", text: promptText },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON");

  return JSON.parse(jsonMatch[0]) as MealAnalysis;
}

export async function analyzeMealImages(
  images: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }[],
  hint?: string,
  lang: "he" | "en" = "he"
): Promise<MealAnalysis> {
  const isHe = lang === "he";
  const count = images.length;

  const promptText = isHe
    ? `${hint ? `המשתמש מתקן או מוסיף מידע על הארוחה: "${hint}". תן עדיפות לתיקון הזה ועדכן את כל הערכים (כולל הקלוריות) בהתאם.\n\n` : ""}לפניך ${count} תמונות של אותה ארוחה מזוויות/מנות שונות. נתח את כולן יחד כארוחה אחת שלמה — סכום כל המנות — ותן ערכים תזונתיים כוללים.

ענה אך ורק ב-JSON תקני, ללא טקסט נוסף:
{
  "description": "תיאור הארוחה הכוללת",
  "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0,
  "items": [{ "name": "שם הרכיב", "estimatedGrams": 0, "calories": 0 }],
  "healthScore": 7,
  "tips": "טיפ אופציונלי",
  "containsVegetables": false
}`
    : `${hint ? `The user is correcting or adding info about the meal: "${hint}". Prioritize this correction and update all values (including calories) accordingly.\n\n` : ""}You have ${count} photos of the same meal from different angles/portions. Analyze them together as one complete meal — sum of all portions — and return total nutritional values.

Reply ONLY with valid JSON:
{
  "description": "full meal description",
  "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0,
  "items": [{ "name": "ingredient name", "estimatedGrams": 0, "calories": 0 }],
  "healthScore": 7,
  "tips": "optional tip",
  "containsVegetables": false
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: [
        ...images.map((img) => ({
          type: "image" as const,
          source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 },
        })),
        { type: "text" as const, text: promptText },
      ],
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON");
  return JSON.parse(jsonMatch[0]) as MealAnalysis;
}

export async function analyzeMealText(description: string, lang: "he" | "en" = "he"): Promise<MealAnalysis> {
  const isHe = lang === "he";
  const promptContent = isHe
    ? `המשתמש נמצא בתהליך ירידה במשקל. הוא תיאר את הארוחה שלו: "${description}"

אנא נתח את הארוחה ותן לי:
1. תיאור קצר בעברית
2. ערכים תזונתיים משוערים: קלוריות, חלבון, פחמימות, שומן, סיבים
3. ציון בריאותי מ-1 עד 10
4. טיפ קצר בעברית לשיפור (אופציונלי)
5. האם הארוחה מכילה ירקות (true/false)

ענה אך ורק ב-JSON תקני בפורמט הבא, ללא טקסט נוסף:
{
  "description": "תיאור הארוחה",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "items": [
    { "name": "שם הרכיב", "estimatedGrams": 0, "calories": 0 }
  ],
  "healthScore": 7,
  "tips": "טיפ אופציונלי",
  "containsVegetables": false
}`
    : `The user is on a weight loss journey. They described their meal: "${description}"

Please analyze the meal and provide:
1. A short description in English
2. Estimated nutritional values: calories, protein, carbs, fat, fiber
3. A health score from 1 to 10
4. A short tip in English to improve the meal (optional)
5. Whether the meal contains vegetables (true/false)

Reply ONLY with valid JSON in the following format, no extra text:
{
  "description": "meal description",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "items": [
    { "name": "ingredient name", "estimatedGrams": 0, "calories": 0 }
  ],
  "healthScore": 7,
  "tips": "optional tip",
  "containsVegetables": false
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: promptContent,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON");
  return JSON.parse(jsonMatch[0]) as MealAnalysis;
}

export async function generatePersonalDaySummary(data: {
  userName: string;
  dailyCalorieTarget: number;
  meals: { description: string; calories: number; protein: number; carbs: number; fat: number; mealType: string }[];
  waterGlasses: number;
  vegetablesServings: number;
  steps?: number;
  workout?: { done: boolean; description?: string; caloriesBurned?: number };
  weightKg?: number;
  targetWeightKg?: number;
  mood: number;
  notes?: string;
  lang?: "he" | "en";
}): Promise<{ summary: string; insights: string[]; tip: string }> {
  const totalCalories = data.meals.reduce((s, m) => s + m.calories, 0);
  const totalBurned = (data.steps ? Math.round(data.steps * 0.0004 * (data.weightKg ?? 70)) : 0)
    + (data.workout?.caloriesBurned ?? 0);
  const isHe = (data.lang ?? "he") === "he";

  const prompt = isHe
    ? `אתה מאמן תזונה וכושר אישי. המשתמש נמצא בתהליך ירידה במשקל. סכם את היום של ${data.userName} בצורה חמה, אישית ומעודדת בעברית, עם התייחסות לירידה במשקל.

נתוני היום:
- ארוחות: ${data.meals.length === 0 ? "לא נרשמו ארוחות" : data.meals.map(m => `${m.description} (${m.calories} קק"ל)`).join(", ")}
- סה"כ קלוריות שנאכלו: ${totalCalories} מתוך יעד ${data.dailyCalorieTarget} קק"ל
- קלוריות שנשרפו: ${totalBurned} קק"ל
- מים: ${data.waterGlasses} ליטר
- ירקות: ${data.vegetablesServings} מנות
- צעדים: ${data.steps ?? "לא דווח"}
- אימון: ${data.workout?.done ? `כן — ${data.workout.description ?? ""}${data.workout.caloriesBurned ? ` (${data.workout.caloriesBurned} קק"ל)` : ""}` : "לא"}
- משקל: ${data.weightKg ? `${data.weightKg} ק"ג` : "לא נמדד"}${data.targetWeightKg ? ` (יעד: ${data.targetWeightKg} ק"ג)` : ""}
- מצב רוח: ${data.mood}/5
${data.notes ? `- הערה: "${data.notes}"` : ""}

תן סיכום אישי, תובנות, וטיפ למחר.`
    : `You are a personal nutrition and fitness coach. The user is on a weight loss journey. Summarize ${data.userName}'s day in a warm, personal and encouraging way in English, with a focus on weight loss progress.

Day data:
- Meals: ${data.meals.length === 0 ? "No meals logged" : data.meals.map(m => `${m.description} (${m.calories} kcal)`).join(", ")}
- Total calories eaten: ${totalCalories} out of target ${data.dailyCalorieTarget} kcal
- Calories burned: ${totalBurned} kcal
- Water: ${data.waterGlasses} liters
- Vegetables: ${data.vegetablesServings} servings
- Steps: ${data.steps ?? "not reported"}
- Workout: ${data.workout?.done ? `yes — ${data.workout.description ?? ""}${data.workout.caloriesBurned ? ` (${data.workout.caloriesBurned} kcal)` : ""}` : "no"}
- Weight: ${data.weightKg ? `${data.weightKg} kg` : "not measured"}${data.targetWeightKg ? ` (target: ${data.targetWeightKg} kg)` : ""}
- Mood: ${data.mood}/5
${data.notes ? `- Note: "${data.notes}"` : ""}

Give a personal summary, insights, and a tip for tomorrow.`;

  // Use tool_use to force a structured response. Avoids JSON parsing failures
  // when the model emits unescaped quotes inside Hebrew text (the previous
  // approach used `text.match(/\{[\s\S]*\}/)` + JSON.parse and broke on those).
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: [
      {
        name: "submit_day_summary",
        description: isHe
          ? "החזר את סיכום היום במבנה הזה"
          : "Return the day summary in this structure",
        input_schema: {
          type: "object" as const,
          properties: {
            summary: {
              type: "string",
              description: isHe
                ? "פסקה אישית של 2-3 משפטים על היום"
                : "Personal 2-3 sentence paragraph about the day",
            },
            insights: {
              type: "array",
              items: { type: "string" },
              description: isHe ? "2-3 תובנות קצרות" : "2-3 short insights",
            },
            tip: {
              type: "string",
              description: isHe ? "טיפ אחד ספציפי למחר" : "One specific tip for tomorrow",
            },
          },
          required: ["summary", "insights", "tip"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_day_summary" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not call submit_day_summary tool");
  }
  const input = toolUse.input as { summary: string; insights: unknown; tip: string };
  const insights = Array.isArray(input.insights)
    ? input.insights
    : typeof input.insights === "string"
    ? [input.insights]
    : [];
  return { summary: input.summary, insights, tip: input.tip };
}

export async function generateDailySummary(
  wingName: string,
  membersData: {
    name: string;
    calories: number;
    steps: number;
    waterGlasses: number;
    vegetables: number;
    dailyTarget: number;
  }[]
): Promise<{
  summary: string;
  highlights: string[];
  motivationMessages: Record<string, string>;
}> {
  const prompt = `
אתה מאמן כושר ואורח חיים בריא שמסכם יום לקבוצה בשם "${wingName}".

נתוני חברי הקבוצה:
${membersData
  .map(
    (m) =>
      `- ${m.name}: ${m.calories} קלוריות (יעד: ${m.dailyTarget}), ${m.steps} צעדים, ${m.waterGlasses} כוסות מים, ${m.vegetables} מנות ירקות`
  )
  .join("\n")}

צור סיכום יומי מעודד בעברית. ענה ב-JSON:
{
  "summary": "סיכום כללי של הקבוצה (2-3 משפטים)",
  "highlights": ["הישג בולט 1", "הישג בולט 2"],
  "motivationMessages": {
    "${membersData.map((m) => m.name).join('": "משפט מוטיבציה...", "')}: "משפט מוטיבציה..."
  }
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON");
  return JSON.parse(jsonMatch[0]);
}
