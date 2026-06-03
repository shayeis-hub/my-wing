/**
 * One-time setup: creates the 4 PayPal billing plans and returns their IDs.
 * Run once after deploy: GET /api/subscriptions/paypal-setup?secret=<CRON_SECRET>
 * Then add the returned plan IDs as Vercel env vars:
 *   PAYPAL_PLAN_ILS_MONTHLY
 *   PAYPAL_PLAN_ILS_YEARLY
 *   PAYPAL_PLAN_USD_MONTHLY
 *   PAYPAL_PLAN_USD_YEARLY
 */
import { NextRequest, NextResponse } from "next/server";
import { createBillingPlan } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Guard: if plans are already configured, don't create duplicates (bypass with &force=1)
  const force = req.nextUrl.searchParams.get("force") === "1";
  const alreadyConfigured =
    process.env.PAYPAL_PLAN_ILS_MONTHLY &&
    process.env.PAYPAL_PLAN_ILS_YEARLY &&
    process.env.PAYPAL_PLAN_USD_MONTHLY &&
    process.env.PAYPAL_PLAN_USD_YEARLY;

  if (alreadyConfigured && !force) {
    return NextResponse.json({
      message: "Plans already configured — no changes made",
      PAYPAL_PLAN_ILS_MONTHLY: process.env.PAYPAL_PLAN_ILS_MONTHLY,
      PAYPAL_PLAN_ILS_YEARLY:  process.env.PAYPAL_PLAN_ILS_YEARLY,
      PAYPAL_PLAN_USD_MONTHLY: process.env.PAYPAL_PLAN_USD_MONTHLY,
      PAYPAL_PLAN_USD_YEARLY:  process.env.PAYPAL_PLAN_USD_YEARLY,
    });
  }

  const [ilsMonthly, ilsYearly, usdMonthly, usdYearly] = await Promise.all([
    createBillingPlan({
      name: "Wingpact Premium — חודשי",
      description: "מנוי חודשי ל-Wingpact Premium",
      currency: "ILS",
      amount: "9.90",
      interval: "MONTH",
    }),
    createBillingPlan({
      name: "Wingpact Premium — שנתי",
      description: "מנוי שנתי ל-Wingpact Premium (חסכון 17%)",
      currency: "ILS",
      amount: "99.00",
      interval: "YEAR",
    }),
    createBillingPlan({
      name: "Wingpact Premium — Monthly",
      description: "Monthly subscription to Wingpact Premium",
      currency: "USD",
      amount: "3.90",
      interval: "MONTH",
    }),
    createBillingPlan({
      name: "Wingpact Premium — Yearly",
      description: "Yearly subscription to Wingpact Premium (save 17%)",
      currency: "USD",
      amount: "39.00",
      interval: "YEAR",
    }),
  ]);

  return NextResponse.json({
    message: "Plans created — add these as Vercel env vars:",
    PAYPAL_PLAN_ILS_MONTHLY: ilsMonthly,
    PAYPAL_PLAN_ILS_YEARLY:  ilsYearly,
    PAYPAL_PLAN_USD_MONTHLY: usdMonthly,
    PAYPAL_PLAN_USD_YEARLY:  usdYearly,
  });
}
