import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { analyzeMealImage, analyzeMealText } from "@/lib/ai/claude";

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mediaType, hint, textDescription } = await req.json();

    if (textDescription) {
      const analysis = await analyzeMealText(textDescription);
      return NextResponse.json(analysis);
    }

    if (!base64Image || !mediaType) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const analysis = await analyzeMealImage(base64Image, mediaType, hint);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Meal analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
