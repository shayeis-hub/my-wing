import { NextRequest, NextResponse } from "next/server";
import { generateDailySummary } from "@/lib/ai/claude";

export async function POST(req: NextRequest) {
  try {
    const { wingName, membersData } = await req.json();
    const result = await generateDailySummary(wingName, membersData);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Summary generation error:", err);
    return NextResponse.json({ error: "Summary failed" }, { status: 500 });
  }
}
