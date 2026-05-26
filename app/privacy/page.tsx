import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-wing-bg p-6" dir="rtl">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 pt-4">
          <Link href="/login" className="text-wing-primary text-sm">← חזרה</Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">מדיניות פרטיות</h1>
          <p className="text-sm text-slate-500 mt-1">עדכון אחרון: מאי 2026</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">1. כללי</h2>
            <p>אפליקציית MY WING ("האפליקציה") מכבדת את פרטיות המשתמשים. מסמך זה מסביר אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם ואיך ניתן לבקש את מחיקתם.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">2. הנתונים שאנו אוספים</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>פרטי חשבון: שם, כתובת דוא"ל</li>
              <li>נתוני פרופיל בריאותי: גיל, גובה, משקל, יעד משקל, רמת פעילות</li>
              <li>נתוני שימוש: ארוחות שצולמו, צ'ק-אינים יומיים, צעדים</li>
              <li>תמונות ארוחות שהועלו לצורך ניתוח תזונתי</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">3. שימוש בנתונים</h2>
            <p>הנתונים משמשים אך ורק לצורך מתן השירות: הצגת סיכומי תזונה, שיתוף נתונים בתוך קבוצת התמיכה שלך ("מבנה כנף"), וניתוח AI של ארוחות. אנו לא מוכרים נתונים לצדדים שלישיים.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">4. אחסון ואבטחה</h2>
            <p>כל הנתונים מאוחסנים בשירותי Firebase של Google (Firestore, Storage, Authentication) בהתאם לתקני האבטחה של Google Cloud. תמונות ארוחות מועברות ל-API של Anthropic לצורך ניתוח ונמחקות לאחר עיבוד.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">5. זכויות המשתמש</h2>
            <p>יש לך זכות לעיין בנתוניך, לתקן אותם, ולמחוק את חשבונך ואת כל הנתונים הקשורים אליו בכל עת דרך הגדרות האפליקציה.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">6. יצירת קשר</h2>
            <p>לכל שאלה בנושא פרטיות ניתן לפנות אל: <a href="mailto:contact@wingpact.app" className="text-wing-primary underline">contact@wingpact.app</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
