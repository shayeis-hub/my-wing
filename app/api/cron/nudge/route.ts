import { NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MESSAGES = [
  {
    title: { male: "אל תשבור את הרצף! 🔥", female: "אל תשברי את הרצף! 🔥" },
    body:  { male: "כבר 17:00 ועוד לא עשית צ׳ק-אין היום. בוא נרשום יחד 💪", female: "כבר 17:00 ועוד לא עשית צ׳ק-אין היום. בואי נרשום יחד 💪" },
  },
  {
    title: { male: "הכנף שלך מחכה לך 👥", female: "הכנף שלך מחכה לך 👥" },
    body:  { male: "חבריך כבר רשמו את היום שלהם. בוא תצטרף 📋", female: "חבריך כבר רשמו את היום שלהם. בואי תצטרפי 📋" },
  },
  {
    title: { male: "30 שניות, זה הכל 🌟", female: "30 שניות, זה הכל 🌟" },
    body:  { male: "הצ׳ק-אין היומי שלך מחכה. תכנס ותרשום את ההצלחות של היום", female: "הצ׳ק-אין היומי שלך מחכה. תכנסי ותרשמי את ההצלחות של היום" },
  },
  {
    title: { male: "17:00 — זמן הצ׳ק-אין! ✅", female: "17:00 — זמן הצ׳ק-אין! ✅" },
    body:  { male: "יום טוב מתחיל בתיעוד. מה אכלת? כמה שתית? בוא נרשום", female: "יום טוב מתחיל בתיעוד. מה אכלת? כמה שתית? בואי נרשום" },
  },
  {
    title: { male: "הרגל קטן, שינוי גדול 📈", female: "הרגל קטן, שינוי גדול 📈" },
    body:  { male: "כל צ׳ק-אין שאתה מבצע מקרב אותך ליעד. אל תוותר היום!", female: "כל צ׳ק-אין שאת מבצעת מקרב אותך ליעד. אל תוותרי היום!" },
  },
  {
    title: { male: "מים, ירקות, מצב רוח... 💧🥦", female: "מים, ירקות, מצב רוח... 💧🥦" },
    body:  { male: "עוד לא רשמת היום. שניה קטנה ואתה מסיים 😊", female: "עוד לא רשמת היום. שניה קטנה ואת מסיימת 😊" },
  },
  {
    title: { male: "הגוף שלך מדבר, תקשיב 🧘", female: "הגוף שלך מדבר, תקשיבי 🧘" },
    body:  { male: "כבר 17:00. בוא תרשום איך היה היום שלך ותתן לעצמך קרדיט", female: "כבר 17:00. בואי תרשמי איך היה היום שלך ותתני לעצמך קרדיט" },
  },
  {
    title: { male: "אל תשכח את עצמך! 🌱", female: "אל תשכחי את עצמך! 🌱" },
    body:  { male: "המסע שלך מתועד כאן. תרשום את היום שלך לפני שהוא נגמר", female: "המסע שלך מתועד כאן. תרשמי את היום שלך לפני שהוא נגמר" },
  },
  {
    title: { male: "כל יום חשוב 🏅", female: "כל יום חשוב 🏅" },
    body:  { male: "גם יום קשה מגיע לתיעוד. בוא ותרשום, כבר 17:00", female: "גם יום קשה מגיע לתיעוד. בואי ותרשמי, כבר 17:00" },
  },
  {
    title: { male: "הגיע הזמן לעצור רגע 🌅", female: "הגיע הזמן לעצור רגע 🌅" },
    body:  { male: "17:00 — רגע לעצמך. כמה שתית? מה אכלת? תן לנו לדעת 💪", female: "17:00 — רגע לעצמך. כמה שתית? מה אכלת? תני לנו לדעת 💪" },
  },
];

// Today's date in Israel timezone (Asia/Jerusalem handles DST automatically)
function todayIsrael(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  getAdminApp();
  const db = admin.firestore();

  const today = todayIsrael();
  const usersSnap = await db.collection("users").get();

  let sent = 0;
  let skipped = 0;

  await Promise.allSettled(
    usersSnap.docs.map(async (userDoc) => {
      const data = userDoc.data();
      const fcmToken: string | undefined = data.fcmToken;
      const wingId: string | undefined = data.wingId;
      const gender: "male" | "female" = data.profile?.gender === "female" ? "female" : "male";

      if (!fcmToken || !wingId) { skipped++; return; }

      // Check if user already checked in today
      const checkinSnap = await db
        .doc(`wings/${wingId}/checkins/${userDoc.id}_${today}`)
        .get();
      if (checkinSnap.exists) { skipped++; return; }

      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

      try {
        await admin.messaging().send({
          token: fcmToken,
          notification: { title: msg.title[gender], body: msg.body[gender] },
          webpush: {
            notification: { icon: "/icons/icon-192.png", dir: "rtl", lang: "he" },
            fcmOptions: { link: "/checkin" },
          },
          apns: { payload: { aps: { sound: "default" } } },
          android: { notification: { sound: "default" } },
        });
        sent++;
      } catch {
        // Invalid token or FCM error — non-critical
      }
    })
  );

  return NextResponse.json({ ok: true, sent, skipped });
}
