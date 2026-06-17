/**
 * One-time housekeeping: deactivate every PayPal billing plan that is NOT one of
 * the 7 currently in use (4 personal + 3 coach env vars). Repeated paypal-setup
 * runs accumulate orphaned ACTIVE plans; this prunes them so only the live ones
 * remain — preventing confusion and accidental signup to a stale (e.g. trial) plan.
 *
 * Dry run (default):  GET /api/subscriptions/plans-cleanup?secret=<CRON_SECRET>
 * Apply:              GET /api/subscriptions/plans-cleanup?secret=<CRON_SECRET>&apply=1
 *
 * Orphaned plans never charge anyone (only subscriptions do), so this is safe.
 */
import { NextRequest, NextResponse } from "next/server";
import { listBillingPlans, deactivateBillingPlan } from "@/lib/paypal";

export const dynamic = "force-dynamic";

function clean(s: string | undefined): string {
  return (s ?? "").replace(/^﻿/, "").replace(/[^\x20-\x7E]/g, "").trim();
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apply = req.nextUrl.searchParams.get("apply") === "1";

  const keepers = new Set(
    [
      process.env.PAYPAL_PLAN_ILS_MONTHLY,
      process.env.PAYPAL_PLAN_ILS_YEARLY,
      process.env.PAYPAL_PLAN_USD_MONTHLY,
      process.env.PAYPAL_PLAN_USD_YEARLY,
      process.env.PAYPAL_COACH_PLAN_BASIC,
      process.env.PAYPAL_COACH_PLAN_EXTENDED,
      process.env.PAYPAL_COACH_PLAN_UNLIMITED,
    ]
      .map(clean)
      .filter(Boolean)
  );

  // Safety: if the env vars aren't readable for some reason, never wipe everything.
  if (keepers.size === 0) {
    return NextResponse.json({ error: "No keeper plan IDs found in env — aborting" }, { status: 500 });
  }

  const all = await listBillingPlans();
  const toDeactivate = all.filter((p) => p.status === "ACTIVE" && !keepers.has(p.id));

  const results: Array<{ id: string; name: string; ok: boolean }> = [];
  if (apply) {
    for (const p of toDeactivate) {
      try {
        await deactivateBillingPlan(p.id);
        results.push({ id: p.id, name: p.name, ok: true });
      } catch (e) {
        console.error("Deactivate failed for", p.id, e);
        results.push({ id: p.id, name: p.name, ok: false });
      }
    }
  }

  return NextResponse.json({
    mode: apply ? "APPLIED" : "DRY_RUN (add &apply=1 to execute)",
    totalPlans: all.length,
    keepersInUse: [...keepers],
    activeToDeactivate: toDeactivate.map((p) => ({ id: p.id, name: p.name })),
    deactivated: apply ? results : undefined,
  });
}
