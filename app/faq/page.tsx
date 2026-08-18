"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PublicAdBanner } from "@/components/ads/PublicAdBanner";

interface FAQ {
  q: string;
  a: string;
}

const FAQS: { category: string; items: FAQ[] }[] = [
  {
    category: "כללי",
    items: [
      {
        q: "מה זה Wingpact?",
        a: "Wingpact היא אפליקציה לירידה במשקל בתמיכה חברתית. יוצרים 'מבנה כנף' — קבוצה קטנה של חברים, משפחה או קולגות — ועוקבים יחד אחרי תזונה, צעדים, שתייה ואתגרים. המחקר מראה שאנשים שמורידים משקל יחד מצליחים פי 2-3 יותר מאשר לבד.",
      },
      {
        q: "האם Wingpact מתאים לכל אחד?",
        a: "כן. Wingpact מתאים לכל מי שרוצה לרדת במשקל, לשמור על משקל קיים, או פשוט לחיות בריא יותר — עם תמיכה של אנשים שהוא מכיר. אין דרישות מיוחדות לגיל, רמת כושר או סוג תזונה.",
      },
      {
        q: "האם צריך לשלם?",
        a: "Wingpact מציע מנוי בסיסי חינמי עם כל הפיצ'רים המרכזיים. קיים גם מנוי Premium שמוסיף פיצ'רים מתקדמים כמו ניתוח תזונה מורחב, היסטוריה ארוכה יותר וסטטיסטיקות מפורטות.",
      },
    ],
  },
  {
    category: "ניתוח ארוחות",
    items: [
      {
        q: "איך עובד ניתוח הארוחות עם AI?",
        a: "מצלמים את הצלחת, ו-AI מזהה את המרכיבים, מעריך את הכמויות ומחשב קלוריות, חלבון, פחמימות ושומן. אפשר להוסיף הערה טקסטואלית לדיוק גבוה יותר. הניתוח מתבצע תוך שניות.",
      },
      {
        q: "כמה מדויק הניתוח?",
        a: "הניתוח מדויק לרוב מ-80-90%. ישנם מקרים שבהם AI מתקשה — מנות מבושלות מורכבות, מאפים ביתיים עם מרכיבים לא ידועים, או ארוחות עם הרבה שכבות. בכל מקרה אפשר לערוך את הנתונים ידנית.",
      },
      {
        q: "האם אפשר לצלם כמה תמונות לאותה ארוחה?",
        a: "כן! אם יש לך ארוחה עם כמה מנות — עיקרית, תוספות, קינוח — אפשר לצלם כל אחת בנפרד ולאחד. הניתוח יסכום את כל הנתונים יחד.",
      },
    ],
  },
  {
    category: "מבנה כנף",
    items: [
      {
        q: "כמה אנשים יכולים להיות בכנף?",
        a: "עד 20 חברים. המחקר מצביע על 4-8 כגודל אידיאלי, אבל בחרנו לאפשר יותר כדי לתת גמישות לקבוצות משפחה או עבודה.",
      },
      {
        q: "מה רואים חברי הכנף?",
        a: "חברי הכנף רואים את הצ'ק-אין היומי שלך (צעדים, שתייה, מצב רוח), ארוחות שבחרת לשתף, ועדכוני משקל. כל פריט ניתן להגדיר בנפרד אם לשתף או לא.",
      },
      {
        q: "איך מצטרפים לכנף?",
        a: "מקבלים קישור הזמנה מאחד מחברי הכנף. לוחצים על הקישור, נכנסים עם גוגל או אפל, ומצטרפים אוטומטית. התהליך לוקח פחות מדקה.",
      },
      {
        q: "אפשר לפרוש מכנף?",
        a: "כן, בכל עת. עוברים להגדרות > כנף ולוחצים 'עזוב כנף'. הנתונים האישיים שלך נשמרים.",
      },
    ],
  },
  {
    category: "ווידג'ט ואפליקציה",
    items: [
      {
        q: "האם יש ווידג'ט למסך הבית?",
        a: "כן! בגרסת האנדרואיד הנייטיבית אפשר להוסיף את הווידג'ט של Wingpact למסך הבית, ומשם לעדכן שתייה ולשלוח SOS ישירות — בלי לפתוח את האפליקציה. גרסת iOS בדרך.",
      },
      {
        q: "על אילו מכשירים האפליקציה עובדת?",
        a: "Wingpact עובדת כ-PWA (אפליקציית ווב) על כל דפדפן מודרני — Android, iOS, Desktop. יש גם אפליקציית אנדרואיד נייטיבית עם ווידג'ט וסנכרון צעדים אוטומטי. גרסה נייטיבית ל-iOS בפיתוח.",
      },
      {
        q: "האם הצעדים נספרים אוטומטית?",
        a: "כן — באפליקציית האנדרואיד הנייטיבית האפליקציה קוראת נתוני Health Connect ומסנכרנת צעדים אוטומטית. תמיכה דומה ב-iOS (דרך HealthKit) מתוכננת עם השקת גרסת iOS.",
      },
    ],
  },
  {
    category: "פרטיות ואבטחה",
    items: [
      {
        q: "האם הנתונים שלי מאובטחים?",
        a: "כן. Wingpact משתמש ב-Firebase של גוגל לאחסון נתונים, עם הצפנה מלאה בתקשורת (HTTPS) ובמנוחה. רק אתה וחברי הכנף שלך רואים את הנתונים שלך.",
      },
      {
        q: "האם Wingpact מוכר את הנתונים שלי?",
        a: "לא. הנתונים שלך לעולם לא נמכרים לצדדים שלישיים. אנחנו משתמשים בנתונים אנונימיים ומצטברים בלבד לשיפור המוצר.",
      },
      {
        q: "איך מוחקים את החשבון?",
        a: "עוברים להגדרות > חשבון > מחק חשבון. כל הנתונים שלך יימחקו לצמיתות תוך 30 יום.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  function toggle(key: string) {
    setOpenIndex(openIndex === key ? null : key);
  }

  return (
    <main className="min-h-screen" style={{ background: "#fbf4e6" }}>
      <PublicNav />

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-6 pt-6 text-sm flex items-center gap-1" style={{ color: "#9e8e7e" }}>
        <Link href="/" className="hover:text-[#ff6b47] transition-colors">בית</Link>
        <ChevronRight size={14} />
        <span style={{ color: "#6b5e4e" }}>שאלות נפוצות</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 pb-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3" style={{ color: "#1a1814" }}>
            שאלות נפוצות
          </h1>
          <p style={{ color: "#6b5e4e" }}>
            כל מה שרצית לדעת על Wingpact
          </p>
        </div>

        {FAQS.map((section) => (
          <div key={section.category} className="mb-8">
            <h2
              className="text-lg font-bold mb-3 pb-2 border-b"
              style={{ color: "#1a1814", borderColor: "#e8dcc8" }}
            >
              {section.category}
            </h2>
            <div className="space-y-2">
              {section.items.map((item, i) => {
                const key = `${section.category}-${i}`;
                const isOpen = openIndex === key;
                return (
                  <div
                    key={key}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm"
                  >
                    <button
                      onClick={() => toggle(key)}
                      className="w-full text-right px-5 py-4 flex items-center justify-between gap-3 hover:bg-orange-50 transition-colors"
                    >
                      <span className="font-semibold text-sm" style={{ color: "#1a1814" }}>
                        {item.q}
                      </span>
                      <ChevronDown
                        size={18}
                        style={{
                          color: "#ff6b47",
                          transform: isOpen ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                          flexShrink: 0,
                        }}
                      />
                    </button>
                    {isOpen && (
                      <div
                        className="px-5 pb-4 text-sm leading-relaxed"
                        style={{ color: "#6b5e4e" }}
                      >
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Ad before contact CTA */}
        <PublicAdBanner className="my-8 rounded-xl overflow-hidden" />

        {/* Contact CTA */}
        <div
          className="p-6 rounded-2xl text-center"
          style={{ background: "linear-gradient(135deg, #fff9e6, #fff0e6)" }}
        >
          <p className="font-bold text-lg mb-2" style={{ color: "#1a1814" }}>
            לא מצאת תשובה?
          </p>
          <p className="text-sm mb-4" style={{ color: "#6b5e4e" }}>
            פנה אלינו ישירות ונחזור אליך בהקדם
          </p>
          <a
            href="mailto:support@wingpact.app"
            className="inline-block px-8 py-3 rounded-full text-white font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
          >
            שלח מייל לתמיכה
          </a>
        </div>
      </div>
    </main>
  );
}

function PublicNav() {
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
      style={{ background: "#fbf4e6", borderColor: "#e8dcc8" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <WingLogoSmall />
        <span className="font-bold text-lg" style={{ color: "#1a1814" }}>
          Wingpact
        </span>
      </Link>
      <div className="flex items-center gap-5 text-sm font-medium" style={{ color: "#6b5e4e" }}>
        <Link href="/blog" className="hover:text-[#ff6b47] transition-colors">
          בלוג
        </Link>
        <Link href="/calorie-calculator" className="hover:text-[#ff6b47] transition-colors">
          מחשבון
        </Link>
        <Link href="/faq" className="hover:text-[#ff6b47] transition-colors">
          שאלות נפוצות
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-1.5 rounded-full text-white text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
        >
          התחל עכשיו
        </Link>
      </div>
    </nav>
  );
}

function WingLogoSmall() {
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="wg-e" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5dd4b" />
          <stop offset="1" stopColor="#ff6b47" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="48" ry="48" fill="url(#wg-e)" />
      <path
        d="M50 75 C30 60 15 45 20 30 C25 15 40 20 50 35 C60 20 75 15 80 30 C85 45 70 60 50 75Z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}
