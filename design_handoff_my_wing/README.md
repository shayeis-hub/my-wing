# Handoff · מבנה כנף · עיצוב מחדש "אופק · גרסת יום"

## סקירה כללית

חבילת design handoff להטמעת מערכת עיצוב חדשה לאפליקציית **מבנה כנף** (github.com/shayeis-hub/my-wing) — אפליקציית ווב רספונסיבית לירידה במשקל מבוססת קבוצות תמיכה קטנות (Next.js 15 + TypeScript + Tailwind CSS + Firebase).

החבילה כוללת:
1. **מצגת מלאה** של מערכת העיצוב החדשה (12 שקפים, HTML)
2. **תיעוד מפורט** של כל מסך, רכיב, וטוקן עיצוב
3. **Roadmap הטמעה** בשלושה שלבים

---

## על קבצי העיצוב

הקבצים שבחבילה הם **אבי־טיפוס HTML שמדגימים את המראה והתחושה** של העיצוב החדש. הם **לא קוד פרודקשן** וצריכים להיות מיושמים בקוד הקיים של Next.js + Tailwind, תוך שימוש בפטרני הקוד הקיימים (Card, Button, Input וכו' ב־`components/ui/`).

המטרה: לבנות את אותו מראה ב־React באמצעות הסביבה הקיימת — לא להעתיק את ה־HTML ישירות.

## רמת דיוק (Fidelity)

**Hi-Fidelity:** העיצוב הוא pixel-perfect. כל הצבעים (hex), הטיפוגרפיה (סוג פונט, משקל, גודל), הריווח, ו־border radii מדויקים ומתועדים כאן. צריך לשחזר את ה־UI בדיוק כפי שמופיע בעיצוב.

---

## הקובץ הראשי

| קובץ | תיאור |
|------|-------|
| `wing-redesign-full.html` | המצגת המלאה — 12 שקפים, כל המסכים בעיצוב החדש |
| `styles.css` | מערכת ה־CSS הראשית (CL- classes לכיוון אופק־יום) |
| `full-styles.css` | סגנונות נוספים למצגת המלאה |
| `my-wing-redesign.html` | מצגת אקספלורציה מקורית עם 3 כיוונים (לעיון בלבד) |

פתח את `wing-redesign-full.html` בדפדפן כדי לדפדף בין 12 השקפים.

---

## מערכת עיצוב — Design Tokens

### צבעים

```js
// tailwind.config.js — להחליף את הצבעים הנוכחיים:
colors: {
  wing: {
    // רקעים
    bg:        '#fbf4e6',  // חול חם · רקע ראשי
    surface:   '#ffffff',  // לבן · רקע כרטיסים
    elevated:  '#fef9ea',  // קרם · רקע כרטיסים משניים
    
    // טקסט
    ink:       '#1a1814',  // דיו · טקסט ראשי
    muted:     '#8a7e68',  // חימר · טקסט משני
    subtle:    '#c9bc9c',  // חימר בהיר · placeholder, גבולות
    
    // גבולות וקווים
    border:    '#ede5d0',  // גבול
    divider:   '#f3ecd9',  // קו מפריד
    
    // צבעי מותג
    sunrise:   '#f5dd4b',  // צהוב זריחה
    coral:     '#ff6b47',  // קורל
    heat:      '#d4541a',  // חימום · להבחנה על רקע בהיר
    honey:     '#c79a00',  // דבש
    
    // צבעי תפקוד
    success:   '#2f8d5f',  // הצלחה
    warning:   '#d4541a',  // אזהרה
    
    // gradient (לשימוש ב־utility class)
    // background: linear-gradient(135deg, #f5dd4b 0%, #ff6b47 100%);
  }
}
```

### גרדיאנט החתימה

```css
/* utility class בגלובלי CSS */
.bg-sunrise {
  background: linear-gradient(135deg, #f5dd4b 0%, #ff6b47 100%);
}
.text-sunrise {
  background: linear-gradient(90deg, #c79a00, #d4541a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**כללי שימוש:** הגרדיאנט נשמר אך ורק לרגעים החשובים — כרטיס הקלוריות הראשי, ה־CTA ראשי, ה־avatar של "אני", ולוגו. **לא** לרקעים גנריים, לא לקישוטים.

### טיפוגרפיה

**שני פונטים בלבד:**
- **Heebo** (כל המשקלים: 300, 400, 500, 600, 700, 800, 900) — לכל הטקסט
- **JetBrains Mono** (400, 500, 600) — למספרים, labels, ערכים טכניים

```js
// tailwind.config.js
fontFamily: {
  sans: ['Heebo', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
},
```

**סקאלת טיפוגרפיה (כל הגדלים ב־px, line-height בסוגריים):**

| תפקיד | פונט | משקל | גודל | letter-spacing |
|------|------|------|------|---|
| Display (מספרים גדולים) | Heebo | 900 | 44-64px | -4.5% |
| Title (H1) | Heebo | 800 | 24px | -2.5% |
| Subtitle (H2) | Heebo | 700 | 13px | +0.4% UPPERCASE |
| Body | Heebo | 500 | 14-16px | -0.5% |
| Body small | Heebo | 400 | 12-13px | 0 |
| Label / Caption | JetBrains Mono | 500 | 9-11px | +18-22% UPPERCASE |
| Data / Numerals | JetBrains Mono | 600 | 10-14px | +4-8% |

### Border Radius

| שימוש | ערך |
|------|-----|
| כרטיסים גדולים (Hero) | 16-20px |
| כרטיסים רגילים | 14px |
| כפתורים | 14px |
| Inputs | 12px |
| Pills | 999px (full) |
| תגי mini | 4-6px |
| כפתורים קטנים | 10px |

### צללים — *לא בשימוש*

המערכת **לא משתמשת בצללים**. במקום צללים — גבולות `1px solid #ede5d0` או הפרדה דרך צבעי רקע (`#fbf4e6` רקע, `#ffffff` כרטיס).

### ריווח (Spacing scale)

הריווח כבר מתאים ל־Tailwind defaults (4px scale): 4, 8, 10, 12, 14, 16, 18, 20, 24, 32, 48, 64, 80, 96px. אין צורך להוסיף ערכים חדשים.

---

## כללי עיצוב מרכזיים

### 1. המספרים גאים
- מספרים גדולים (קלוריות, צעדים, משקל) בתצוגת Display, Heebo Black 900
- תמיד עם `font-feature-settings: "tnum"` (tabular nums) להבטחת רוחב אחיד
- letter-spacing שלילי גדול (-4-5%) למספרים גדולים

### 2. הגרדיאנט = ההישג
- שמור אך ורק ל־3-4 אלמנטים במסך: כרטיס Hero, CTA ראשי, avatar של המשתמש הנוכחי
- **אסור** להשתמש לרקעים כלליים, להיר־טקסט, או לקישוטים

### 3. אייקונים במקום אמוג'י
- ה־UI עצמו (ניווט, כפתורים, סטטוסים) משתמש באייקונים מ־**Lucide** (כבר בשימוש בקוד)
- אמוג'י נשארים אך ורק ב:
  - תגובות משתמשים (תוכן שמשתמש כתב)
  - בחירת מצב רוח (זה החוויה המרכזית של הצ'ק־אין)
- אייקונים: stroke-width 1.6-1.8 (1.8 עבור active), גודל 18-24px

### 4. שחור = עוגנים בלבד
- צבע `#1a1814` (דיו) משמש לטקסט ראשי, אווטרים של חברים לא־פעילים, ולכפתור Ink ("המשך")
- **לא** כצבע רקע (אלא ב־Phase 3 לשלב 03 ב־roadmap)

### 5. המבנה תמיד נוכח
- כל מסך חייב להציג את החברים הנוכחיים במצב היום שלהם
- שורת avatars עם status (צעדים, מצב רוח) — נראית כמעט בכל מסך

---

## רכיבים — מיפוי לקוד הקיים

| רכיב במצגת | קובץ בקוד | שינויים נדרשים |
|-----------|-----------|----------------|
| `CL-btn-primary` | `components/ui/Button.tsx` (variant: primary) | רקע: גרדיאנט `linear-gradient(135deg, #f5dd4b, #ff6b47)`, טקסט שחור, font-weight: 800 |
| `CL-btn-secondary` | `components/ui/Button.tsx` (variant: secondary) | רקע: לבן, גבול `1px solid #ede5d0`, טקסט שחור |
| `CL-card` | `components/ui/Card.tsx` | רקע לבן, גבול `1px solid #ede5d0`, radius 14px, **בלי shadow** |
| `CL-card.hero` | חדש — `<HeroCard>` | רקע גרדיאנט, בלי גבול, מספר Display בפנים |
| `CL-pill` | חדש — `<Pill>` | רקע לבן, גבול, radius 999px |
| `CL-pill.active` | (state של Pill) | רקע שחור, טקסט קרם |
| `CL-pill.glow` | (state של Pill) | רקע גרדיאנט בהיר, בלי גבול |
| Bottom Nav | `components/layout/BottomNav.tsx` | רקע לבן, פינות מעוגלות 22px, מרחק 12px מהקצוות (floating), active state בצבע coral `#d4541a` |
| MealCard | `components/meals/MealCard.tsx` | ארוחה אחרונה: hero card עם תמונה מלאה. שאר הארוחות: שורה compact |
| Avatar | `components/ui/Avatar.tsx` | רגיל: רקע ל־`#1a1814` או `#2f8d5f`. המשתמש הנוכחי: רקע גרדיאנט + badge "YOU" |
| ProgressBar | `components/ui/ProgressBar.tsx` | גובה 4-8px, רקע `#ede5d0`, fill = גרדיאנט (או שחור על רקע גרדיאנט) |
| Switch | חדש — `<Switch>` | OFF: רקע `#ede5d0`. ON: גרדיאנט |

---

## מסכים — תיעוד מפורט

עיין במצגת `wing-redesign-full.html` שקף אחר שקף. כל שקף מציג:
- את המסך בתצוגת iPhone (360×740px content area)
- annotations משמאל/ימין שמסבירים החלטות עיצוב

### 1. Dashboard (`/dashboard` · שקף 04)

**Layout (מלמעלה למטה):**
1. **Header** (height ~50px): תאריך + ברכה "בוקר טוב, שי" + avatar (36px)
2. **Hero card** — קלוריות: גרדיאנט, padding 18px, radius 16px
   - Label: "קלוריות היום" (Mono 9px)
   - מספר: Display 48px Heebo 900, color `#1a1814`
   - Progress bar: 5px height, רקע `rgba(26,24,20,0.18)`, fill `#1a1814`
   - Sub-text: Mono 10px
3. **Stats row** — 3 כרטיסים: צעדים / מים / סטריק
   - לכל אחד: רקע לבן, גבול, padding 12px
   - Label: Mono 9px UPPERCASE
   - מספר: Heebo 900 20px
4. **Wing card** — "הלהקה היום"
   - Title: "הלהקה היום" + ספירת פעילים (Mono small)
   - 4 avatars בשורה, "אני" עם badge "YOU" שחור
5. **Primary CTA** — "צלם ארוחה" עם אייקון מצלמה Lucide
6. **Secondary actions** (2-column grid): "צ'ק־אין יומי" + "🆘 SOS"

### 2. Meals List (`/meals` · שקף 05)

**Layout:**
1. **Header**: label + title "ארוחות" + כפתור "צלם" קטן
2. **Member filter pills**: הכל / שלי / נועה / דניאל
3. **Hero meal** (הארוחה האחרונה):
   - תמונה מלאה רוחב, גובה 130px
   - תגית "צהריים · 13:20" בפינה
   - Overlay תחתון עם שם + תיאור + מספר קלוריות
   - שורת macros בצבעים: חלבון=קורל, פחמ׳=דבש, שומן=ירוק
4. **Compact meal rows** (שאר הארוחות):
   - תמונה 46×46 בצד, פרטים בצד שני
   - מספר קלוריות בשמאל

### 3. Meal Detail (`/meals/[id]` · שקף 05)

**Layout:**
1. **Hero image** — רוחב מלא, גובה 280px, כפתורי delete/edit בפינה
2. **Title row**: שם משתמש + שם הארוחה
3. **Calories block** — בגרדיאנט, מספר Display
4. **Macros grid** — 3 כרטיסים: חלבון / פחמ׳ / שומן
5. **Items breakdown** — רשימה עם משקל וקלוריות לכל פריט
6. **Comments** — תגובות חברים בכרטיסי גרדיאנט בהיר

### 4. Camera + AI (`/meals/new` · שקף 06)

זרימה של 3 מסכים:
1. **Camera** (רקע שחור): מסגרת זיהוי צהובה, hint למסגור, כפתור צילום גרדיאנט עגול
2. **Analyzing**: תמונה + סריקת קו צהוב מואנמת + רשימה progressive של פריטים מזוהים
3. **Review**: תוצאות לעריכה — תיאור, macros, סוג ארוחה, זמן + hint לתיקון

### 5. Check-in (`/checkin` · שקף 07)

5 כרטיסים אנכיים:
1. **Water** — slider עם גרדיאnt, scale 0-4L
2. **Vegetables** — counter עם +/− (כפתור + בגרדיאנט)
3. **Workout** — switch למעלה, נפתח לסוג + עצימות + משך
4. **Mood** — 5 רגשונים, הנבחר ברקע גרדיאנט בהיר
5. **Submit button** — גרדיאנט, "שמור · ייצר סיכום AI"

### 6. Steps + Leaderboard (`/steps` · שקף 08)

1. **Header**: label + title + סטטוס Google Fit
2. **Big ring** — SVG ring 220px, גרדיאנט, מספר במרכז (Display 48px)
3. **3 mini stats**: יעד / קק"ל / ק"מ
4. **Leaderboard** — 4 שורות, "אני" עם רקע גרדיאנט בהיר

### 7. Wing / Members (`/wing` · שקף 09)

1. **Header**: גלגל שיניים בפינה (הגדרות)
2. **Weekly challenge** — כרטיס גרדיאנט עם progress bar
3. **Members list** — 4 שורות: avatar, שם, ארוחות+צעדים+מצב רוח, סטריק
4. **Invite card** — קישור הזמנה / QR
5. **SOS button** — כפתור outline אדום

### 8. Onboarding (שקף 10)

4 מסכים:
1. **Login** — לוגו V wing, email+password, Google sign-in
2. **Join wing** — קוד הזמנה / יצירת מבנה חדש (steps indicator)
3. **Profile** — משקל נוכחי / יעד / גובה / רמת פעילות
4. **Goals** — יעד קלוריות מחושב (Hero card), macros, צפי הגעה ליעד

---

## אינטראקציות ואנימציות

- **טרנזישנים כלליים**: 200ms ease-out לכל hover/state changes
- **כפתורים**: `transform: scale(0.97)` ב־`:active`
- **כרטיסים**: בלי hover (מובייל-first)
- **המצלמה**: 
  - אנימציית סריקה — קו צהוב נע מלמעלה למטה (3s linear infinite)
  - reveal של פריטים מזוהים — fade-in + slide-up (300ms staggered)
- **Progress bars**: animate-on-mount (400ms ease-out)
- **Bottom nav**: ה־icon הפעיל גדל ב־stroke-width מ־1.8 ל־2

---

## State Management

ה־app כבר משתמש ב־Firebase + React hooks. שינויי העיצוב הם בעיקר ב־UI layer ו**לא** דורשים שינוי במבנה הדאטה:

- כל types ב־`types/index.ts` נשארים זהים
- כל ה־hooks (`useAuth`, `useWing`, `useMeals`) ללא שינוי
- שינויים נדרשים ב־`components/` ו־`app/(app)/*/page.tsx` בלבד

---

## נכסים (Assets)

### פונטים
מ־Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### אייקונים
**Lucide React** (כבר מותקן בפרויקט):
- `Home`, `UtensilsCrossed`, `CalendarDays`, `CheckSquare`, `Users` — ה־bottom nav
- `Camera`, `Pencil`, `X`, `ChevronDown`, `Clock`, `Plus`, `Minus`
- `Trophy`, `Activity`, `Droplet`, `Salad`
- `AlertTriangle` — SOS

### לוגו (V Wing)
SVG פנימי (אין צורך להוריד אסט):

```jsx
<svg width="60" height="36" viewBox="0 0 60 36" fill="none">
  <defs>
    <linearGradient id="wing-sun" x1="0" y1="0" x2="60" y2="0">
      <stop offset="0" stop-color="#f5dd4b"/>
      <stop offset="1" stop-color="#ff6b47"/>
    </linearGradient>
  </defs>
  <path d="M4 30 L30 8 L56 30" stroke="url(#wing-sun)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="30" cy="8" r="3" fill="#d4541a"/>
  <circle cx="17" cy="19" r="1.8" fill="#1a1814"/>
  <circle cx="43" cy="19" r="1.8" fill="#1a1814"/>
</svg>
```

---

## Roadmap הטמעה (3 שלבים)

### Phase 01 — Design Tokens (~1 יום)
1. עדכן `tailwind.config.js` עם הצבעים והפונטים מהטבלאות לעיל
2. עדכן `app/globals.css`:
   - שנה את `--font-geist-sans` ל־Heebo
   - הוסף את ה־import של Google Fonts
   - שנה את `body { background-color }` ל־`#fbf4e6`
3. עדכן את `app/layout.tsx` להעמיס Heebo במקום Inter
4. ✅ **תוצאה**: כל המסכים הקיימים מקבלים את הפלטה החדשה אוטומטית

### Phase 02 — Core Components (~3 ימים)
1. עדכן את `components/ui/Button.tsx`:
   - Primary: רקע גרדיאנט, טקסט שחור, weight 800
   - Secondary: רקע לבן עם גבול
   - הוסף variant חדש "ink" (רקע שחור)
2. עדכן `components/ui/Card.tsx`:
   - הסר את ה־shadow
   - הוסף גבול 1px
   - הוסף variant חדש "hero" (גרדיאנט)
3. עדכן `components/ui/Input.tsx`:
   - רקע `#fbf4e6` (sand)
   - גבול `#ede5d0`
   - focus state: גבול שחור 2px
4. עדכן `components/layout/BottomNav.tsx`:
   - פינות מעוגלות 22px
   - floating מרחק 12px מהקצוות
   - active color → coral
   - הסר אמוג'י מהלייבלים (השאר רק את ה־Lucide icons)
5. עדכן `components/meals/MealCard.tsx`:
   - הארוחה האחרונה: hero card עם תמונה מלאה
   - שאר: compact rows
6. עדכן את כל ה־page.tsx ב־`app/(app)/`:
   - החלף אמוג'י באייקונים Lucide
   - שנה כותרות לשימוש בטיפוגרפיה החדשה
   - הוסף Mono labels במקום טקסט רגיל לתאריכים/קטגוריות

### Phase 03 — Full Experience (~6 ימים)
1. בנה Onboarding חדש (`app/(app)/onboarding/page.tsx`) עם 4 שלבים
2. שדרג את `components/meals/MealCamera.tsx` עם הסריקה האנימטיבית
3. הוסף `framer-motion` לאנימציות מיקרו (sliders, switches, transitions)
4. עצב מחדש את ה־DaySummary card (סיכום AI) ב־`app/(app)/checkin/page.tsx`
5. הוסף streak badges, weekly challenge cards
6. אופטימיזציה ל־A11y (contrast ratios, focus states)

---

## דברים שחשוב לזכור

1. **RTL First**: כל ה־UI ב־RTL (עברית). הקפד על `direction: rtl` ועל סדר אלמנטים נכון
2. **Mobile First**: האפליקציה היא PWA — תכנן לעובי 360-414px ראשית, ואז responsively עד desktop
3. **בלי emoji ב־UI**: אמוג'י רק בתוכן משתמש (תגובות, mood). הכל אחר → אייקונים Lucide
4. **בלי shadows**: הפרדה דרך גבולות וצבעי רקע
5. **טיפוגרפיה רחבה**: השתמש ב־letter-spacing שלילי למספרים גדולים. ה־`tabular-nums` הוא חובה

---

## שאלות? פתחים פתוחים

- האם להוסיף dark mode? כרגע יש רק light. אפשר להוסיף בעתיד את הגרסה הכהה שתועדה ב־`my-wing-redesign.html` (שקפים 8-9).
- האם להוסיף האנימציות עם framer-motion או להישאר עם CSS-only? המלצה: framer-motion ל־Phase 03, CSS לכל השאר.
- האם להמיר ל־PWA מלא (offline first)? נושא לדיון נפרד.

---

**גרסה:** 1.0 · מאי 2026  
**מקור:** github.com/shayeis-hub/my-wing  
**מבנה כנף · MY WING**
