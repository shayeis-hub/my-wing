import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-wing-bg p-6" dir="rtl">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 pt-4">
          <Link href="/login" className="text-wing-primary text-sm">← חזרה</Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-800">תנאי שימוש</h1>
          <p className="text-sm text-slate-500 mt-1">עדכון אחרון: מאי 2026</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">1. קבלת התנאים</h2>
            <p>השימוש באפליקציית MY WING מהווה הסכמה לתנאים המפורטים להלן. אם אינך מסכים לתנאים, אנא הפסק את השימוש באפליקציה.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">2. השירות</h2>
            <p>MY WING היא אפליקציה לתמיכה בתהליך ירידה במשקל, המאפשרת מעקב תזונה, ניתוח ארוחות בעזרת AI ושיתוף עם קבוצת תמיכה קרובה.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">3. אזהרה רפואית</h2>
            <p className="font-medium text-amber-700 bg-amber-50 rounded-2xl p-3">האפליקציה אינה מהווה ייעוץ רפואי, תזונתי או דיאטטי מקצועי. כל המידע המוצג הוא למטרות מעקב אישי בלבד. לפני כל שינוי משמעותי בתזונה או פעילות גופנית, יש להתייעץ עם רופא או דיאטן מוסמך.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">4. אחריות המשתמש</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>למסור פרטים נכונים בעת ההרשמה</li>
              <li>לא לשתף תוכן פוגעני, מזיק או בלתי חוקי</li>
              <li>לא לנסות לגשת לנתונים של משתמשים אחרים</li>
              <li>לשמור על סיסמתך בסוד</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">5. קניין רוחני</h2>
            <p>כל הזכויות על האפליקציה, לרבות עיצוב, קוד ותכנים, שמורות. אין להעתיק, לשכפל או להפיץ ללא אישור בכתב.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">6. שינויים בשירות</h2>
            <p>אנו שומרים לעצמנו את הזכות לשנות או להפסיק את השירות בכל עת. שינויים מהותיים יפורסמו מראש.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-800 text-base">7. יצירת קשר</h2>
            <p>לכל שאלה בנושא תנאי השימוש: <a href="mailto:shayeis@gmail.com" className="text-wing-primary underline">shayeis@gmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
