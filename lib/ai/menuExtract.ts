import { sanitizeMenu, type MenuData } from "@/lib/coach/menu";

const PROMPT = `זהו תפריט תזונה שדיאטנית כתבה ללקוח שלה. חלץ אותו למבנה JSON מדויק.

כללים:
- העתק כמויות ומנות בדיוק כפי שהן כתובות. אל תמציא, אל תשלים ואל תשנה כמויות.
- "meals": כל ארוחה בתפריט (בוקר, ביניים, צהריים, ערב וכו'). לכל ארוחה "options" - החלופות שהלקוח יכול לבחור מהן, כל חלופה כמחרוזת אחת עם הכמויות ("2 פרוסות לחם מלא + ביצה + ירקות").
- אם התפריט שונה בין ימים, מלא "day" בכל ארוחה (למשל "יום א'"). אם הוא זהה כל יום, השמט את "day".
- אם יש שעה או טווח שעות לארוחה, מלא "time". אחרת השמט.
- "targets": יעדי קלוריות/חלבון/פחמימות/שומן יומיים אם נכתבו במפורש (מספרים בלבד). אחרת השמט.
- "avoid": מזונות להימנע מהם או להגביל, כפי שנכתב.
- "notes": הנחיות כלליות (שתייה, בישול, רשימות תמורות, התייחסות לשבת וכו').
- "unclear": כל דבר שלא הצלחת לקרוא בוודאות או שהוא דו-משמעי, כדי שהדיאטנית תבדוק.
- בלי הסברים: החזר JSON בלבד בפורמט:
{"title":"","targets":{"calories":0,"proteinG":0,"carbsG":0,"fatG":0},"meals":[{"name":"","time":"","day":"","options":[""]}],"avoid":[""],"notes":[""],"unclear":[""]}`;

type Block = { type: string; [k: string]: unknown };

/** Sends the content blocks + the extraction prompt to Claude and returns the sanitized menu. */
async function run(blocks: Block[]): Promise<MenuData> {
  const body = JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: [...blocks, { type: "text", text: PROMPT }] }],
  });

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body,
    });
    if (res.status !== 529 && res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  if (!res || !res.ok) {
    throw new Error(`menu extraction failed: ${res?.status} ${(await res?.text())?.slice(0, 200)}`);
  }
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.find((c) => c.type === "text")?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("menu extraction returned no JSON");
  return sanitizeMenu(JSON.parse(match[0]));
}

/**
 * Sends the uploaded menu (PDF or photo) to Claude once and returns it as
 * structured data. The Anthropic REST API is called directly because the
 * pinned SDK predates GA PDF ("document") blocks.
 */
export async function extractMenu(base64: string, mediaType: string): Promise<MenuData> {
  const isPdf = mediaType === "application/pdf";
  return run([
    isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
  ]);
}

/** Word documents arrive as extracted text (tables flattened to "a | b" rows). */
export async function extractMenuFromText(text: string): Promise<MenuData> {
  return run([{ type: "text", text: `תוכן המסמך:\n\n${text.slice(0, 60_000)}` }]);
}
