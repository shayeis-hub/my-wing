import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret, validateFitDadRow, provisionFitDadUser, type FitDadRowInput } from "@/lib/fitDadAdmin";

export const dynamic = "force-dynamic";
// Bulk imports can be dozens of admin.auth().createUser calls in sequence —
// each is a real network round-trip, so give this more room than the default.
export const maxDuration = 60;

interface Body {
  rows: FitDadRowInput[];
  /** true = validate only, write nothing (the "show me what will happen" preview the plan calls for before creating dozens of accounts). */
  preview?: boolean;
  createdBy?: string;
}

export async function POST(req: NextRequest) {
  const authError = requireAdminSecret(req);
  if (authError) return authError;

  try {
    const { rows, preview, createdBy } = (await req.json()) as Body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows" }, { status: 400 });
    }
    if (!preview && !createdBy?.trim()) {
      return NextResponse.json({ error: "MISSING_CREATED_BY" }, { status: 400 });
    }

    if (preview) {
      const results = await Promise.all(
        rows.map(async (row) => ({ row, error: await validateFitDadRow(row) }))
      );
      return NextResponse.json({ results });
    }

    // Commit — sequential, not Promise.all: each createUser is independent
    // but running dozens in parallel risks tripping Firebase Auth rate
    // limits, and a per-row failure shouldn't abort the rest of the batch.
    const results: { row: FitDadRowInput; uid?: string; wingId?: string | null; error?: string }[] = [];
    for (const row of rows) {
      try {
        const { uid, wingId } = await provisionFitDadUser(row, createdBy!.trim());
        results.push({ row, uid, wingId });
      } catch (err) {
        const code = (err as { code?: string }).code;
        results.push({ row, error: code ?? (err instanceof Error ? err.message : String(err)) });
      }
    }
    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("fitdad bulk-import error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
