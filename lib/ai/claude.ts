import Anthropic from "@anthropic-ai/sdk";
import type { MealAnalysis } from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeMealImage(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  hint?: string
): Promise<MealAnalysis> {
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
          {
            type: "text",
            text: `${hint ? `המשתמש מציין שהארוחה היא: "${hint}". השתמש במידע זה לצד התמונה לניתוח מדויק יותר.\n\n` : ""}אנא נתח את הצלחת בתמונה הזו ותן לי:
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
  "tips": "טיפ אופציונלי"
}`,
          },
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

export async function analyzeMealText(description: string): Promise<MealAnalysis> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `המשתמש תיאר את הארוחה שלו: "${description}"

אנא נתח את הארוחה ותן לי:
1. תיאור קצר בעברית
2. ערכים תזונתיים משוערים: קלוריות, חלבון, פחמימות, שומן, סיבים
3. ציון בריאותי מ-1 עד 10
4. טיפ קצר בעברית לשיפור (אופציונלי)

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
  "tips": "טיפ אופציונלי"
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON");
  return JSON.parse(jsonMatch[0]) as MealAnalysis;
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
