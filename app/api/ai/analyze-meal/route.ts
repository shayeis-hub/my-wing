import { NextRequest, NextResponse } from "next/server";
import { analyzeMealImage } from "@/lib/ai/claude";

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mediaType } = await req.json();

    if (!base64Image || !mediaType) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const analysis = await analyzeMealImage(base64Image, mediaType);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Meal analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
