import Link from "next/link";

export const metadata = { title: "מדיניות החזרות – Wingpact" };

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-wing-bg p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="pt-4">
          <Link href="/login" className="text-wing-primary text-sm">← חזרה</Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">מדיניות החזרות</h1>
          <p className="text-sm text-slate-500 mt-1">עודכן לאחרונה: מאי 2026</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">1. סוחר הרשומה</h2>
            <p>כל התשלומים עבור מנוי Wingpact Premium מעובדים על ידי <strong>Paddle</strong> (paddle.com), הפועלת כסוחרת הרשומה. Paddle אחראית על החיוב, החשבוניות, גביית המסים וטיפול בסכסוכי תשלום מטעמנו.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">2. אחריות להחזר כספי של 14 יום</h2>
            <p>אם אינך מרוצה ממנוי Wingpact Premium שלך, תוכל לבקש החזר כספי מלא תוך <strong>14 יום</strong> מהרכישה הראשונית. לבקשת החזר בתקופה זו, צור קשר בכתובת <a href="mailto:contact@wingpact.app" className="text-wing-primary underline">contact@wingpact.app</a> עם הנושא "בקשת החזר" וכתובת הדוא"ל הרשומה שלך.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">3. חידושים</h2>
            <p>חידושי מנוי (חודשי או שנתי) אינם ניתנים להחזר לאחר תחילת תקופת החיוב החדשה. ייתכנו חריגים לפי שיקול דעתנו הבלעדי במקרים של בעיות טכניות מתועדות שמנעו גישה לשירות.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">4. ביטול</h2>
            <p>ניתן לבטל את המנוי בכל עת דרך דף ניהול המנויים באפליקציה. הביטול מפסיק חיובים עתידיים; אינו מייצר החזר לתקופת החיוב הנוכחית (למעט האמור בסעיף 2 לעיל).</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">5. תוכנית חינמית</h2>
            <p>התוכנית החינמית ניתנת ללא עלות ואינה כפופה למדיניות החזרות זו.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">6. כיצד מעובדים החזרים</h2>
            <p>החזרים מאושרים מונפקים לאמצעי התשלום המקורי תוך 5–10 ימי עסקים, בהתאם למנפיק הכרטיס שלך. ההחזרים מעובדים על ידי Paddle מטעמנו.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">7. יצירת קשר</h2>
            <p>לבקשות החזר או שאלות חיוב, פנה ל: <a href="mailto:contact@wingpact.app" className="text-wing-primary underline">contact@wingpact.app</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
