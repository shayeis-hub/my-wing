import type { Metadata } from "next";
import Image from "next/image";
import { AppleBadge, GooglePlayBadge, WingLogo } from "../shared";

export const metadata: Metadata = {
  title: "Wingpact מצב ספר - האפליקציה המלווה ל\"הרגל אחד בכל פעם\"",
  description:
    "האפליקציה המלווה לספר \"הרגל אחד בכל פעם\". מזינים את הקוד מהספר, מתקינים הרגל אחד בכל פעם, ועוקבים עם צ'ק-אין יומי וניתוח ארוחות ב-AI.",
};

export default function OneHabitLandingHe() {
  return (
    <div dir="rtl" lang="he" className="bg-wing-bg text-wing-ink min-h-screen">
      {/* Nav */}
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <WingLogo size={30} />
          <span className="text-sm font-bold text-wing-muted whitespace-nowrap">Wingpact · מצב ספר</span>
        </div>
        <div className="flex items-center gap-5 whitespace-nowrap">
          <a href="/?lang=en" className="text-sm font-medium text-wing-muted hover:text-wing-ink transition-colors">
            English
          </a>
          <a href="https://wingpact.app" className="hidden sm:inline text-sm font-medium text-wing-muted hover:text-wing-ink transition-colors">
            wingpact.app &larr;
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-10 pb-20 text-center">
        <h1 className="font-black text-[clamp(38px,7vw,64px)] leading-[1.05] tracking-tight mb-6">
          הרגל אחד.
          <br />
          <span className="bg-gradient-to-r from-wing-honey to-wing-heat bg-clip-text text-transparent">
            בכל פעם.
          </span>
        </h1>
        <p className="text-lg leading-relaxed text-wing-ink/70 max-w-xl mx-auto mb-10">
          האפליקציה המלווה לספר <em>הרגל אחד בכל פעם</em>. מזינים את הקוד מהספר והופכים כל אחד
          משמונת ההרגלים לתרגול יומי - עם צ&apos;ק-אין, ניתוח ארוחות ב-AI, וללא שעון סופר לאחור בהרגל הראשון.
        </p>
        <div dir="ltr" className="flex items-center justify-center gap-3 flex-wrap mb-4">
          <AppleBadge />
          <GooglePlayBadge />
        </div>
        <p className="text-xs text-wing-muted">חינם עד סוף הרגל 1 · בלי כרטיס אשראי כדי להתחיל</p>
      </section>

      {/* Habits screenshot showcase */}
      <section className="max-w-4xl mx-auto px-6 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-sm font-bold text-wing-heat mb-3">איך זה עובד</div>
          <h2 className="font-black text-3xl leading-tight mb-5">
            לא עוד מעקב הרגלים.
            <br />
            השיטה של הספר, בכיס.
          </h2>
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wing-sunrise to-wing-coral flex items-center justify-center font-black text-sm flex-shrink-0">1</div>
              <div>
                <p className="font-bold mb-0.5">ההרגל הנוכחי שלכם, במרכז</p>
                <p className="text-sm text-wing-ink/65 leading-relaxed">סימן מפעיל, פעולה, תגמול ומשפט ההפעלה - בדיוק כמו שהספר מלמד.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wing-sunrise to-wing-coral flex items-center justify-center font-black text-sm flex-shrink-0">2</div>
              <div>
                <p className="font-bold mb-0.5">התשובות של הספר, כשצריך אותן</p>
                <p className="text-sm text-wing-ink/65 leading-relaxed">&quot;מה אולי עובר לכם בראש&quot; וטיפים למצבים מאתגרים, בדיוק להרגל שאתם עובדים עליו.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wing-sunrise to-wing-coral flex items-center justify-center font-black text-sm flex-shrink-0">3</div>
              <div>
                <p className="font-bold mb-0.5">מסמנים כמותקן, פותחים את הבא</p>
                <p className="text-sm text-wing-ink/65 leading-relaxed">בלי לחץ - אין מועד סופי. הספר מציע בדיקת יציבות של 11 מתוך 14 ימים לפני שמתקדמים.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <div dir="ltr" className="rounded-[2rem] border-[6px] border-wing-ink overflow-hidden shadow-2xl max-w-[280px]">
            <Image src="/onehabit/he/habits.jpg" alt="לשונית ההרגלים, הרגל 1: מים לפני האוכל" width={720} height={1559} className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* More screenshots */}
      <section className="bg-wing-surface border-y border-wing-border py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-sm font-bold text-wing-heat mb-3 text-center">יום-יום</div>
          <h2 className="font-black text-3xl text-center mb-10">כלים פשוטים, סביב ההרגל</h2>
          <div dir="ltr" className="grid grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="rounded-2xl border-[5px] border-wing-ink overflow-hidden shadow-xl">
              <Image src="/onehabit/he/dashboard.jpg" alt="מסך הבית" width={720} height={1405} className="w-full h-auto" />
            </div>
            <div className="rounded-2xl border-[5px] border-wing-ink overflow-hidden shadow-xl mt-8">
              <Image src="/onehabit/he/meals.jpg" alt="ניתוח ארוחה בתמונה עם טיפ להרגל" width={720} height={1410} className="w-full h-auto" />
            </div>
          </div>
          <p className="text-center text-sm text-wing-muted mt-8 max-w-md mx-auto">
            צ&apos;ק-אין יומי של שתי דקות, תמונה של הצלחת לניתוח AI מיידי, ועד 2 חברים שמצטרפים בחינם על המנוי שלכם.
          </p>
        </div>
      </section>

      {/* Redeem steps */}
      <section id="redeem" className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-sm font-bold text-wing-heat mb-3 text-center">מתחילים</div>
        <h2 className="font-black text-3xl text-center mb-12">שלושה צעדים, מהעמוד האחרון בספר</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-wing-surface border border-wing-border rounded-2xl p-6">
            <div className="w-9 h-9 rounded-full bg-wing-ink text-wing-bg flex items-center justify-center font-black mb-4">1</div>
            <p className="font-bold mb-1.5">מורידים את Wingpact</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">מהאפ סטור או מ-Google Play למעלה. נרשמים עם מייל או גוגל - אותו חשבון כמו כל משתמש Wingpact.</p>
          </div>
          <div className="bg-wing-surface border border-wing-border rounded-2xl p-6">
            <div className="w-9 h-9 rounded-full bg-wing-ink text-wing-bg flex items-center justify-center font-black mb-4">2</div>
            <p className="font-bold mb-1.5">מזינים את הקוד</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">
              הקוד המודפס בסוף <em>הרגל אחד בכל פעם</em> פותח את מצב הספר בחשבון שלכם מיד.
            </p>
          </div>
          <div className="bg-wing-surface border border-wing-border rounded-2xl p-6">
            <div className="w-9 h-9 rounded-full bg-wing-ink text-wing-bg flex items-center justify-center font-black mb-4">3</div>
            <p className="font-bold mb-1.5">מתחילים בהרגל הראשון</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">חינם כל עוד תצטרכו. בלי שעון ובלי כרטיס אשראי.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-wing-surface border-y border-wing-border py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-sm font-bold text-wing-heat mb-3 text-center">מנוי</div>
          <h2 className="font-black text-3xl text-center mb-3">הרגל ראשון בחינם. פשוט גם אחר כך.</h2>
          <p className="text-center text-wing-ink/65 max-w-lg mx-auto mb-12">
            אחרי שסימנתם את הרגל 1 כמותקן ועוברים להרגל 2, ממשיכים עם שאר השיטה - ומזמינים עד 2 חברים בחינם.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 max-w-xl mx-auto">
            <div className="bg-wing-bg border-2 border-wing-heat rounded-2xl p-7 relative">
              <div className="absolute -top-3 left-6 bg-wing-heat text-white text-xs font-bold px-3 py-1 rounded-full">
                חיסכון של 17%
              </div>
              <p className="font-bold text-wing-ink/70 mb-1">שנתי</p>
              <p className="font-black text-4xl mb-1">₪89</p>
              <p className="text-sm text-wing-muted">לשנה</p>
            </div>
            <div className="bg-wing-bg border border-wing-border rounded-2xl p-7">
              <p className="font-bold text-wing-ink/70 mb-1">חודשי</p>
              <p className="font-black text-4xl mb-1">₪8.90</p>
              <p className="text-sm text-wing-muted">לחודש</p>
            </div>
          </div>
          <p className="text-center text-xs text-wing-muted mt-6">המחיר בישראל. במדינות אחרות המחיר מוצג בחנות, לפי המטבע המקומי.</p>
          <div className="flex justify-center mt-10">
            <div dir="ltr" className="rounded-2xl border-[5px] border-wing-ink overflow-hidden shadow-xl max-w-[220px]">
              <Image src="/onehabit/he/subscription.jpg" alt="מסך המנוי של מצב הספר" width={720} height={1559} className="w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 py-20">
        <h2 className="font-black text-3xl text-center mb-10">שאלות</h2>
        <div className="space-y-6">
          <div>
            <p className="font-bold mb-1">האפליקציה היא תחליף לספר?</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">לא. הספר עובד לגמרי בפני עצמו. האפליקציה היא אפשרות ליווי בלבד - ההרגלים שייכים לכם.</p>
          </div>
          <div>
            <p className="font-bold mb-1">צריך לסיים את הרגל 1 עד מועד מסוים?</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">לא. הספר מציע בדיקת יציבות: האם עשיתם את זה לפחות ב־11 מתוך 14 הימים האחרונים. הפיכה לאוטומטי לגמרי לוקחת בדרך כלל יותר זמן (חציוני של 66 ימים, בטווח 18 עד 254).</p>
          </div>
          <div>
            <p className="font-bold mb-1">אני כבר משתמש Wingpact - אפשר להזין קוד?</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">כן. בהגדרות יש &quot;יש לי קוד מהספר&quot; - זה מוסיף את מצב הספר לחשבון הקיים, בלי הרשמה חדשה.</p>
          </div>
          <div>
            <p className="font-bold mb-1">זה בק&quot;ג או בפאונד?</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">בעברית: קילוגרמים וסנטימטרים, כמו בספר העברי. באנגלית: פאונד ורגל/אינץ&apos;. הכול לפי שפת האפליקציה.</p>
          </div>
          <div>
            <p className="font-bold mb-1">יש גרסה לאנדרואיד?</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">כן, ב-Google Play וגם באפ סטור - אותו חשבון ואותו קוד.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-wing-border py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-wing-muted">
          <div className="flex items-center gap-2">
            <WingLogo size={22} />
            <span>Wingpact</span>
          </div>
          <div className="flex gap-6">
            <a href="https://wingpact.app/privacy" className="hover:text-wing-ink transition-colors">פרטיות</a>
            <a href="https://wingpact.app/terms" className="hover:text-wing-ink transition-colors">תנאי שימוש</a>
            <a href="https://wingpact.app/contact" className="hover:text-wing-ink transition-colors">צור קשר</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
