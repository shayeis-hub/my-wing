# תוכנית עבודה — Play Billing לאנדרואיד + הסרת PayPal

נכתב 2026-08-22. מצב פתיחה שנבדק מול Firestore ואושר: **אין אף מנוי פעיל בתשלום.**
המנוי היחיד שסומן PayPal פג ב-2026-07-03, והמנוי היחיד ב-Apple הוא בדיקת הסנדבוקס.
חשבון המאמן היחיד מקבל גישה ידנית דרך `coachAccess`, לא דרך מנוי בתשלום.

**המשמעות:** אין הגירת לקוחות, אין סיכון לקטוע חיוב פעיל. זה החלון הנוח ביותר לעשות
את שני השינויים, ואם נחכה הוא ייסגר.

---

## החלטה שצריך לקבל לפני שמתחילים

אחרי הסרת PayPal, **מה רואה מי שנכנס מהדפדפן** (לא מהאפליקציה)?

| אפשרות | משמעות | עלות |
|---|---|---|
| **א. בלי מכירה בוובּ** | מונטיזציה רק דרך החנויות. הדפדפן מציג "הורידו את האפליקציה כדי לשדרג" | הכי פשוט, אפס תחזוקה. מוותר על מכירה לגולשי דסקטופ |
| **ב. RevenueCat Web Billing** | RevenueCat מוכר גם בוובּ, הכול מאוחד תחת אותו entitlement | דורש הקמה נוספת + עמלה, אבל שומר על ערוץ הוובּ |
| **ג. להשאיר PayPal לוובּ בלבד** | מסירים מהאפליקציות, משאירים באתר | לא באמת "מוחקים PayPal" — התחזוקה נשארת |

ההמלצה שלי: **א**, לפחות בשלב הזה. אין היום הכנסות מהוובּ שמצדיקות את התחזוקה, ותמיד
אפשר להוסיף את ב' מאוחר יותר בלי לגעת שוב באפליקציות.

**החלטה שנייה — מסלול המאמנים.** `app/api/coach/*` בנוי כולו על PayPal. היום הוא לא
מייצר הכנסה (הגישה ניתנת ידנית). האפשרויות: להסיר גם אותו, או להשאיר מוקפא כפי שהוא.

---

## חלק א' — Play Billing לאנדרואיד

הבסיס כבר קיים: `@revenuecat/purchases-capacitor` הוא חוצה־פלטפורמות, ה-entitlement
וה-offering מוגדרים, וה-webhook והסנכרון בשרת אגנוסטיים לחנות. רוב העבודה היא הגדרה,
לא קוד.

### שלב 1 — מוצרים ב-Google Play `[אתה]`
1. Play Console → Monetize → Subscriptions → צור שני מנויים:
   - `wingpact_premium_monthly` — base plan חודשי, ₪9.90
   - `wingpact_premium_yearly` — base plan שנתי, ₪99
2. הפעל אותם (Activate) — מוצר לא פעיל לא יוחזר ל-SDK.

> שמור על אותם Product IDs כמו ב-Apple. RevenueCat ממפה אותם לאותה חבילה, וזה
> חוסך התפצלות בקוד ובאנליטיקס.

### שלב 2 — הרשאת שרת ל-RevenueCat `[אתה]`
3. Google Cloud Console → צור Service Account לפרויקט של האפליקציה, והורד מפתח JSON.
4. Play Console → Users and permissions → הזמן את כתובת ה-Service Account והענק לה
   הרשאות פיננסיות (View financial data + Manage orders).
5. RevenueCat → Apps → + New → Play Store → Package name **`app.wingpact.android`**
   (אומת ב-`android/app/build.gradle:13` — שים לב שהוא **שונה** מזה של iOS,
   `app.wingpact.ios`) → העלה את ה-JSON.

> זה המקבילה של "שני המפתחות" שנתקלנו בהם ב-Apple. בלי זה RevenueCat לא יוכל לאמת
> רכישות, והמוצרים יופיעו כ-"Could not check" בדיוק כמו שקרה לנו.

### שלב 3 — חיבור לקטלוג הקיים `[אתה]`
6. RevenueCat → Product catalog → Products → הוסף את שני מוצרי Play.
7. צרף אותם ל-entitlement הקיים **WingPact Premium**.
8. Offering `default1` → הוסף את מוצרי Play לחבילות `$rc_monthly` ו-`$rc_annual`
   הקיימות (חבילה אחת מכילה מוצר לכל חנות — לא ליצור offering נפרד).
9. Project settings → API keys → העתק את מפתח ה-SDK של אנדרואיד (`goog_...`) ושלח לי.

### שלב 4 — קוד `[אני]`
10. `RevenueCatSync.tsx` — בחירת מפתח לפי `Capacitor.getPlatform()`, כך שאנדרואיד
    מקבל את `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
11. `subscription/page.tsx` — להחליף את כרטיס "רק בוובּ" של אנדרואיד בכפתורי הרכישה.
    בפועל זה הרחבת התנאי מ-`isIOSNative` ל-`isNativeApp()`; שאר הלוגיקה כבר משותפת.
12. לשנות שם ל-`app/api/subscriptions/apple-sync` → `iap-sync`. הוא כבר אגנוסטי
    (קורא entitlements מ-RevenueCat), רק השם מטעה.
13. `revenuecat-webhook` — לוודא טיפול ב-`store: "PLAY_STORE"` ובאירועים ייחודיים
    לאנדרואיד, ולעדכן את `SubscriptionProvider` ב-`types/index.ts` עם `"google"`.
14. `npx cap sync android`, `tsc --noEmit`, commit + push → בילד CI.

### שלב 5 — משתני סביבה `[אני, אחרי שאקבל את המפתח]`
15. `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` ל-Vercel.

### שלב 6 — בדיקה `[אתה + אני]`
16. Play Console → Setup → License testing → הוסף את כתובת ה-Gmail שלך. `[אתה]`
17. להעלות את הבילד ל-Internal testing ולהתקין ממנו. `[אתה]`

> **חשוב:** לפי מה שלמדנו קודם, אפליקציה חתומה ב-Play חוסמת התקנה מקומית, וחיוב
> בכלל לא עובד ב-APK צדדי. הבדיקה חייבת לעבור דרך טראק אמיתי.

18. לבצע רכישה חודשית, שנתית, ושחזור; לוודא ש-`users/{uid}.subscription` מתעדכן
    ושהמסכים החסומים נפתחים. `[אתה + אני]`

---

## חלק ב' — הסרת PayPal

מתבצע **אחרי** שאנדרואיד עובד, לא במקביל — כדי שלא יהיה רגע שבו אין שום מסלול תשלום.

### שלב 7 — הסרה מהקוד `[אני]`
19. מחיקת קבצים:
    - `lib/paypal.ts`
    - `app/api/subscriptions/create-checkout`, `create-portal`, `paypal-setup`,
      `paypal-webhook`, `plans-cleanup`
    - לפי ההחלטה על המאמנים: `app/api/coach/checkout`, `cancel`, `paypal-setup`,
      `sync-status`
20. `lib/subscription.ts` — הסרת `PAYPAL_PLANS`.
21. `subscription/page.tsx` — ענף הוובּ מוחלף במסך "שדרגו מהאפליקציה" (לפי החלטה א').
22. `app/pricing/page.tsx` + `app/en/pricing/page.tsx` — הסרת כפתורי הרכישה.
23. `components/subscription/UpgradeModal.tsx` — מפנה כרגע ל-checkout; להפנות למסך המנוי.
24. `types/index.ts` — **להשאיר** את `paypalSubscriptionId` ואת `"paypal"` ב-
    `SubscriptionProvider`. מסמכים היסטוריים עדיין מכילים אותם, ומחיקת השדה תשבור
    קריאה של רשומות ישנות.

### שלב 8 — ניקוי חיצוני `[אתה]`
25. PayPal Dashboard → ביטול ה-webhook שמצביע ל-`wingpact.app`.
26. PayPal Dashboard → השבתת ה-billing plans.
27. אשר לי למחוק את משתני `PAYPAL_*` מ-Vercel — **רק אחרי** 25-26, כדי שלא יגיע
    webhook לנתיב שכבר לא קיים בזמן שהמפתחות עוד חיים.

### שלב 9 — סגירה `[אני]`
28. הרצת `tsc --noEmit`, commit + push.
29. עדכון `docs/` וקובץ הזיכרון.

---

## סדר מומלץ

```
1-3   הגדרות Play + RevenueCat        [אתה]
4-5   קוד + env                        [אני]
6     בדיקת סנדבוקס באנדרואיד          [שנינו]
      ── רק אחרי שזה עובד ──
7     הסרת PayPal מהקוד                [אני]
8     ניקוי בצד PayPal                 [אתה]
9     סגירה                            [אני]
```

## מה חוסם מה

- שלבים 4-5 ממתינים למפתח ה-SDK משלב 3.
- שלב 6 ממתין לבילד בטראק פנימי, שממתין ל-CI משלב 4.
- חלק ב' כולו ממתין לאישור שחלק א' עובד.
- אין תלות בין זה לבין הביקורת של אפל שרצה כרגע — הקוד באנדרואיד לא נוגע ב-iOS,
  אבל **לא נדחוף שינויים ל-main עד שאפל תסיים**, כדי שלא ישתנה משהו מתחת לידיים
  של הבודק (האפליקציה טוענת את האתר בזמן אמת).
