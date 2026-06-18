/**
 * One-time setup: creates the 3 coach (dietitian) PayPal billing plans.
 * Run once after deploy: GET /api/coach/paypal-setup?secret=<CRON_SECRET>
 * Then add the returned plan IDs as Vercel env vars:
 *   PAYPAL_COACH_PLAN_BASIC      (₪89/mo, up to 10 clients)
 *   PAYPAL_COACH_PLAN_EXTENDED   (₪249/mo, up to 30 clients)
 *   PAYPAL_COACH_PLAN_UNLIMITED  (₪499/mo, unlimited clients)
 */
import { NextRequest, NextResponse } from "next/server";
import { createBillingPlan, listBillingPlans, deactivateBillingPlan } from "@/lib/paypal";
import { COACH_PLANS } from "@/lib/subscription";

export const dynamic = "force-dynamic";

// Deactivate older ACTIVE coach plans so repeated setup runs never accumulate.
async function deactivateOldCoachPlans(keepIds: string[]): Promise<number> {
  const keep = new Set(keepIds);
  let n = 0;
  try {
    const all = await listBillingPlans();
    for (const p of all) {
      if (p.status === "ACTIVE" && p.name?.startsWith("Wingpact Coach") && !keep.has(p.id)) {
        try { await deactivateBillingPlan(p.id); n++; } catch (e) { console.error("deactivate", p.id, e); }
      }
    }
  } catch (e) {
    console.error("coach self-clean failed:", e);
  }
  return n;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const alreadyConfigured =
    process.env.PAYPAL_COACH_PLAN_BASIC &&
    process.env.PAYPAL_COACH_PLAN_EXTENDED &&
    process.env.PAYPAL_COACH_PLAN_UNLIMITED;

  if (alreadyConfigured && !force) {
    return NextResponse.json({
      message: "Coach plans already configured — no changes made",
      PAYPAL_COACH_PLAN_BASIC: process.env.PAYPAL_COACH_PLAN_BASIC,
      PAYPAL_COACH_PLAN_EXTENDED: process.env.PAYPAL_COACH_PLAN_EXTENDED,
      PAYPAL_COACH_PLAN_UNLIMITED: process.env.PAYPAL_COACH_PLAN_UNLIMITED,
    });
  }

  const [basic, extended, unlimited] = await Promise.all([
    createBillingPlan({
      name: "Wingpact Coach — Starter",
      description: `מסלול דיאטנ/ית — ${COACH_PLANS.basic.label}`,
      currency: "ILS",
      amount: COACH_PLANS.basic.priceILS.toFixed(2),
      interval: "MONTH",
    }),
    createBillingPlan({
      name: "Wingpact Coach — Premium",
      description: `מסלול דיאטנ/ית — ${COACH_PLANS.extended.label}`,
      currency: "ILS",
      amount: COACH_PLANS.extended.priceILS.toFixed(2),
      interval: "MONTH",
    }),
    createBillingPlan({
      name: "Wingpact Coach — Business",
      description: `מסלול דיאטנ/ית — ${COACH_PLANS.unlimited.label}`,
      currency: "ILS",
      amount: COACH_PLANS.unlimited.priceILS.toFixed(2),
      interval: "MONTH",
    }),
  ]);

  // Deactivate any older coach plans so they don't pile up over time.
  const deactivated = await deactivateOldCoachPlans([basic, extended, unlimited]);

  return NextResponse.json({
    message: "Coach plans created — add these as Vercel env vars:",
    PAYPAL_COACH_PLAN_BASIC: basic,
    PAYPAL_COACH_PLAN_EXTENDED: extended,
    PAYPAL_COACH_PLAN_UNLIMITED: unlimited,
    oldPlansDeactivated: deactivated,
  });
}
