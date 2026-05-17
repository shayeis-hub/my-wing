# 🪽 מבנה כנף | MY WING

אפ��יקציה חברתית לירידה במשקל המבוססת על קבוצות תמיכה קטנות וסגורות.

## סטאק טכנולוגי

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, FCM)
- **AI**: Claude claude-sonnet-4-6 (Anthropic) – ניתוח ארוחות וסיכומים
- **Hosting**: Vercel

## התקנה מקומית

### 1. התקן תלויות
```bash
npm install
```

### 2. הגדר Firebase

1. צור פרויקט ב-[Firebase Console](https://console.firebase.google.com)
2. הפעל: **Authentication** (Email/Password + Google), **Firestore**, **Storage**, **Cloud Messaging**
3. בהגדרות הפרויקט → Web app → העתק את ה-config

### 3. הגדר משתני סביבה

העתק את הקובץ ומלא את הערכים:
```bash
cp .env.local.example .env.local
```

### 4. הגדר VAPID Key לנוטיפיקציות

ב-Firebase Console → Project Settings → Cloud Messaging → Generate key pair

### 5. הוסף את מפתח Anthropic

ב-`.env.local` הכנס: `ANTHROPIC_API_KEY=sk-ant-...`

### 6. Deploy Firestore Rules
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage
```

### 7. הרץ לוקאלית
```bash
npm run dev
```

האפליקציה פועלת על `http://localhost:3000`

## Deploy ל-Vercel

1. Push ל-GitHub
2. חבר ב-[Vercel](https://vercel.com) → Import Project
3. הוסף את כל משתני הסביבה מ-`.env.local`
4. עדכן `NEXT_PUBLIC_APP_URL` ל-URL של Vercel

## מבנה הפרויקט

```
app/
  (auth)/login|register   # דפי התחברות
  (app)/                  # דפים מוגנים (דורשים התחברות)
    dashboard/            # לוח בקרה ראשי
    meals/                # צילום וניתוח ארוחות (AI)
    steps/                # צעדים + לוח תוצאות
    checkin/              # צ'ק-אין יומי
    calculator/           # מחשבון BMI/TDEE
    wing/                 # ניהול המבנה
    challenges/           # אתגרים שבועיים
  join/[token]/           # הצטרפות דרך קישור
  api/
    ai/analyze-meal/      # ניתוח תמונת ארוחה עם Claude
    ai/daily-summary/     # סיכום יומי AI
    notifications/sos/    # שליחת SOS לחברי המבנה
    wing/create|join/     # ניהול מבנים

components/               # רכיבי UI
lib/firebase/             # Firebase config + auth + firestore
lib/ai/                   # Claude API integration
lib/utils/                # מחשבוני BMR/TDEE + utilities
hooks/                    # React hooks
types/                    # TypeScript types
```

## תכונות עיקריות

| תכונה | תיאור |
|-------|--------|
| 🍽️ ניתוח ארו��ות | צלם ➜ Claude AI מנתח קלוריות וערכים תזונתיים |
| 👟 לוח צעדים | עדכון ידני + לוח תוצאות קבוצתי |
| ✅ צ'ק-אי�� | מעקב מים, ירקות ומצב רוח |
| 🆘 כפתור SOS | התראת פוש לכל ח��רי המבנה |
| 🏆 אתגרים | מנהל המבנה יוצר אתגרים ש��ועיים |
| 🧮 מחשבון | BMI + TDEE + יעד קלוריות אישי |
| 🤖 סיכום AI | סיכום יומי/שבועי מותאם אישית |
