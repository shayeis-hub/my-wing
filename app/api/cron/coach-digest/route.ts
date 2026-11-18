import { NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { isCoachActive } from "@/lib/subscription";
import { getCoachClientStatuses } from "@/lib/server/coachStatus";
import type { ClientStatus, StatusFlag } from "@/lib/coach/status";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_NAMES = 3;

// Gender-neutral on purpose: we don't know the client's gender.
function reason(c: ClientStatus): string {
  if (c.flags.includes("silent")) return `${c.daysSinceActivity} ימים בלי פעילות`;
  const order: StatusFlag[] = ["no_data", "menu_off", "weight_up", "low_logging"];
  const labels: Record<string, string> = {
    no_data: "אין נתונים",
    menu_off: "חריגות מהתפריט",
    weight_up: "עלייה במשקל",
    low_logging: "רישום דל",
  };
  const f = order.find((x) => c.flags.includes(x));
  return f ? labels[f] : "";
}

export function buildDigest(clients: ClientStatus[]): { title: string; body: string } | null {
  const needing = clients.filter((c) => c.flags.some((f) => f !== "new"));
  if (needing.length === 0) return null;
  const title = needing.length === 1 ? "סיכום בוקר: לקוח אחד דורש תשומת לב" : `סיכום בוקר: ${needing.length} לקוחות דורשים תשומת לב`;
  const shown = needing.slice(0, MAX_NAMES).map((c) => `${c.displayName} - ${reason(c)}`);
  const more = needing.length - shown.length;
  return { title, body: shown.join(" · ") + (more > 0 ? ` · ועוד ${more}` : "") };
}

/**
 * Daily morning push to each active dietitian: who needs attention today
 * (most urgent first, top 3 by name). Nothing is sent on days when everyone is
 * fine. ?dryRun=1 returns the composed messages without sending.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  getAdminApp();
  const db = admin.firestore();
  const coaches = await db.collection("users").where("accountType", "==", "business").get();

  let sent = 0;
  let skipped = 0;
  const preview: { coach: string; title: string; body: string }[] = [];

  await Promise.allSettled(
    coaches.docs.map(async (doc) => {
      const d = doc.data();
      if (!isCoachActive(d.coach) || d.notificationPrefs?.coachDigest === false) { skipped++; return; }
      const token: string | undefined = d.fcmToken;
      if (!token && !dryRun) { skipped++; return; }

      const { clients } = await getCoachClientStatuses(doc.id);
      const digest = buildDigest(clients);
      if (!digest) { skipped++; return; }
      if (dryRun) { preview.push({ coach: d.displayName ?? doc.id, ...digest }); return; }

      try {
        await admin.messaging().send({
          token: token!,
          notification: { title: digest.title, body: digest.body },
          data: { link: "/coach", type: "coach_digest" },
          webpush: { notification: { icon: "/icons/icon-192.png", dir: "rtl", lang: "he" }, fcmOptions: { link: "/coach" } },
          apns: { payload: { aps: { sound: "default" } } },
          android: { notification: { sound: "default" } },
        });
        sent++;
      } catch {
        /* invalid token or FCM error — non-critical */
      }
    })
  );

  return NextResponse.json(dryRun ? { ok: true, dryRun: true, preview, skipped } : { ok: true, sent, skipped });
}
