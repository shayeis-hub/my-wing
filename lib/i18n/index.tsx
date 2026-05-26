"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "he" | "en";

// ── Translations ─────────────────────────────────────────────────────────────

export const T = {
  he: {
    // Common
    save: "שמור",
    cancel: "ביטול",
    send: "שלח",
    loading: "טוען...",
    saving: "שומר...",
    error: "שגיאה",
    optional: "אופציונלי",
    or: "או",
    close: "סגור",
    my: "שלי",

    // Nav
    nav_home: "בית",
    nav_meals: "ארוחות",
    nav_calendar: "לוח",
    nav_checkin: "צ'ק-אין",
    nav_challenges: "אתגרים",
    nav_menu: "תפריט",

    // Hamburger menu
    menu_title: "תפריט",
    menu_profile: "הפרופיל שלי",
    menu_wing: "מבנה הכנף",
    menu_language: "שפה",
    menu_contact: "צור קשר",
    menu_privacy: "הצהרת פרטיות",
    menu_terms: "תנאי שימוש",
    menu_signout: "התנתק",
    lang_he: "עברית",
    lang_en: "English",

    // Auth
    app_name: "מבנה כנף",
    app_tagline: "יורדים במשקל ביחד",
    login_email: "אימייל",
    login_password: "סיסמה",
    login_submit: "התחבר",
    login_submitting: "מתחבר...",
    login_google: "המשך עם Google",
    login_no_account: "אין לך חשבון?",
    login_register_link: "הירשם",
    login_error: "אימייל או סיסמה שגויים",
    login_google_error: "ההתחברות עם Google נכשלה",
    register_name: "שם מלא",
    register_email: "אימייל",
    register_password: "סיסמה (לפחות 6 תווים)",
    register_submit: "הירשם",
    register_submitting: "נרשם...",
    register_google: "המשך עם Google",
    register_have_account: "יש לך חשבון?",
    register_login_link: "כניסה",
    register_password_short: "הסיסמה חייבת להכיל לפחות 6 תווים",
    register_email_exists: "אימייל זה כבר קיים במערכת",
    register_error: "ההרשמה נכשלה, נסה שוב",
    register_google_error: "ההתחברות עם Google נכשלה",
    link_privacy: "פרטיות",
    link_terms: "תנאי שימוש",
    link_contact: "צור קשר",
    link_delete: "מחיקת חשבון",

    // Dashboard
    dashboard_hello: "שלום",
    dashboard_hello_default: "חבר",
    dashboard_calories_today: "קלוריות היום",
    dashboard_meals_count: (n: number) => `${n} ארוחות`,
    dashboard_wing_name: (name: string, total: number, active: number) =>
      `${name} · ${total} חברים (${active} פעילים היום)`,
    dashboard_no_checkin: "עוד לא עשית צ'ק-אין היום",
    dashboard_go_checkin: "עשה צ'ק-אין עכשיו ←",
    dashboard_steps_today: "צעדים היום",
    dashboard_target: "יעד",
    dashboard_wing_today: "מבנה הכנף",
    dashboard_no_meals: "אין ארוחות מתועדות היום",
    dashboard_weight_progress: "מעקב משקל",
    dashboard_streak: "רצף",
    dashboard_days: "ימים",
    dashboard_notif_text: "אפשר התראות לקבל SOS מהחברים",
    dashboard_notif_no: "לא עכשיו",
    dashboard_notif_yes: "אפשר",

    // Checkin
    checkin_title: "צ'ק-אין יומי",
    checkin_retro: "✏️ מילוי רטרואקטיבי",
    checkin_water: "שתיית מים",
    checkin_veg: "ירקות",
    checkin_veg_sub: "בארוחות היום",
    checkin_ew: "חלון אכילה",
    checkin_ew_auto: "חזור לאוטומטי",
    checkin_ew_manual: "ערוך ידנית",
    checkin_ew_open: "פתיחה",
    checkin_ew_close: "סגירה",
    checkin_ew_duration: "משך",
    checkin_ew_waiting: "ממתין לארוחה הבאה...",
    checkin_ew_open_label: "פתיחת חלון",
    checkin_ew_close_label: "סגירת חלון",
    checkin_ew_hint: "יחושב אוטומטית מהארוחות שנרשמו היום",
    checkin_ew_dur_label: (h: number) => `משך: ${h} שעות`,
    checkin_steps: "צעדים",
    checkin_steps_ph: "כמה צעדים עשית היום?",
    checkin_workout: "התאמנתי היום",
    checkin_workout_dur: "משך האימון",
    checkin_workout_min: "דקות",
    checkin_workout_light: "קל",
    checkin_workout_moderate: "בינוני",
    checkin_workout_intense: "אינטנסיבי",
    checkin_mood: "מצב רוח",
    checkin_weight: "עדכון משקל",
    checkin_weight_unit: "ק\"ג",
    checkin_notes: "הערה חופשית",
    checkin_notes_ph: "איך היה היום? משהו שרצית לציין...",
    checkin_save_m: "שמור צ'ק-אין",
    checkin_save_f: "שמרי צ'ק-אין",
    checkin_update_m: "עדכן צ'ק-אין",
    checkin_update_f: "עדכני צ'ק-אין",
    checkin_saving_m: "שומר...",
    checkin_saving_f: "שומרת...",
    checkin_close_day: "סגירת יום",
    checkin_closing_m: "מייצר סיכום AI...",
    checkin_closing_f: "מייצרת סיכום AI...",
    checkin_saved_ok_m: "הצ'ק-אין נשמר! 💪",
    checkin_saved_ok_f: "הצ'ק-אין נשמרה! 💪",
    checkin_day_summary: "סיכום היום שלך",
    checkin_hide_summary: "הסתר סיכום",
    checkin_group: "המבנה היום",
    checkin_no_checkin: "עדיין לא עשה/תה צ'ק-אין היום",
    checkin_encourage_ph: (name: string) => `עודד את ${name}...`,
    checkin_reply_ph: "הגב / תודה...",
    checkin_weight_ph: (w: number) => `משקל רשום: ${w}`,

    // Challenges
    challenges_title: "אתגרים שבועיים",
    challenge_add: "+ אתגר",
    challenge_no_active: "אין אתגר פעיל",
    challenge_no_active_member: "צור אתגר חדש למבנה",
    challenge_no_active_guest: "המנהל עוד לא יצר אתגר",
    challenge_goal: "יעד",
    challenge_steps_unit: "צעדים",
    challenge_new: "אתגר חדש",
    challenge_name_label: "שם האתגר",
    challenge_name_ph: "7 ימי הליכה...",
    challenge_desc_label: "תיאור",
    challenge_desc_ph: "כל אחד עושה...",
    challenge_target_label: "יעד (מספר)",
    challenge_create_btn: "צור אתגר",
    challenge_created: "האתגר נוצר! 🏆",
    challenge_error: "שגיאה ביצירת האתגר",
    ct_steps: "יעד צעדים",
    ct_water: "שתיית מים",
    ct_veg: "ירקות יומיים",
    ct_sugar: "ללא סוכר",
    ct_cal: "יעד קלוריות",

    // Profile
    profile_title: "הפרופיל שלי",
    profile_wing_btn: "מבנה הכנף",
    profile_my_data: "הנתונים שלי",
    profile_age: "גיל",
    profile_height: "גובה",
    profile_weight: "משקל נוכחי",
    profile_target_weight: "משקל יעד",
    profile_gender: "מגדר",
    profile_activity: "רמת פעילות",
    profile_calculated: "ערכים מחושבים",
    profile_bmi_base: "קק\"ל בסיס",
    profile_tdee_day: "קק\"ל/יום",
    profile_steps_goal: "יעד צעדים יומי",
    profile_steps_unit: "צעד/יום",
    profile_save_goal: "שמור יעד",
    profile_steps_invalid: "יעד צעדים לא תקין",
    profile_steps_saved: "יעד הצעדים עודכן ✅",
    profile_uploading: "מעלה תמונה...",
    profile_photo_saved: "תמונת הפרופיל עודכנה ✅",
    profile_photo_error: "שגיאה בהעלאת התמונה",
    profile_save_error: "שגיאה בשמירה",
    profile_signout: "התנתק",
    gender_male: "זכר",
    gender_female: "נקבה",
    activity_sedentary: "יושבני",
    activity_light: "קל",
    activity_moderate: "בינוני",
    activity_active: "פעיל",
    activity_very_active: "מאוד פעיל",

    // Meals
    meals_title: "הארוחות שלי",
    meals_all: "כולם",
    meals_photo: "צלם ארוחה",
    meals_manual: "הוסף ידנית",
    meals_no_meals: "עוד אין ארוחות",
    meals_add_first: "צלם ארוחה ראשונה",
    meals_type_breakfast: "בוקר",
    meals_type_lunch: "צהריים",
    meals_type_dinner: "ערב",
    meals_type_snack: "חטיף",
    meals_manual_title: "הוספה ידנית",
    meals_description: "תיאור הארוחה",
    meals_calories: "קלוריות",
    meals_protein: "חלבון (ג')",
    meals_carbs: "פחמימות (ג')",
    meals_fat: "שומן (ג')",
    meals_meal_type: "סוג ארוחה",
    meals_time: "שעת ארוחה",
    meals_save: "שמור ארוחה",
    meals_saved: "הארוחה נשמרה! 🥗",
    meals_save_error: "שגיאה בשמירת הארוחה",
    meals_today: "היום",

    // Steps / Calendar / Wing
    steps_title: "לוח תוצאות",
    calendar_title: "לוח שנה",
    wing_title: "מבנה הכנף",
  },

  en: {
    // Common
    save: "Save",
    cancel: "Cancel",
    send: "Send",
    loading: "Loading...",
    saving: "Saving...",
    error: "Error",
    optional: "Optional",
    or: "or",
    close: "Close",
    my: "Mine",

    // Nav
    nav_home: "Home",
    nav_meals: "Meals",
    nav_calendar: "Calendar",
    nav_checkin: "Check-in",
    nav_challenges: "Challenges",
    nav_menu: "Menu",

    // Hamburger menu
    menu_title: "Menu",
    menu_profile: "My Profile",
    menu_wing: "My Wing",
    menu_language: "Language",
    menu_contact: "Contact Us",
    menu_privacy: "Privacy Policy",
    menu_terms: "Terms of Use",
    menu_signout: "Sign Out",
    lang_he: "עברית",
    lang_en: "English",

    // Auth
    app_name: "MY WING",
    app_tagline: "Lose weight together",
    login_email: "Email",
    login_password: "Password",
    login_submit: "Sign In",
    login_submitting: "Signing in...",
    login_google: "Continue with Google",
    login_no_account: "Don't have an account?",
    login_register_link: "Register",
    login_error: "Incorrect email or password",
    login_google_error: "Google sign-in failed",
    register_name: "Full name",
    register_email: "Email",
    register_password: "Password (at least 6 characters)",
    register_submit: "Register",
    register_submitting: "Registering...",
    register_google: "Continue with Google",
    register_have_account: "Already have an account?",
    register_login_link: "Sign In",
    register_password_short: "Password must be at least 6 characters",
    register_email_exists: "This email is already registered",
    register_error: "Registration failed, please try again",
    register_google_error: "Google sign-in failed",
    link_privacy: "Privacy",
    link_terms: "Terms",
    link_contact: "Contact",
    link_delete: "Delete Account",

    // Dashboard
    dashboard_hello: "Hello",
    dashboard_hello_default: "friend",
    dashboard_calories_today: "Calories Today",
    dashboard_meals_count: (n: number) => `${n} meal${n !== 1 ? "s" : ""}`,
    dashboard_wing_name: (name: string, total: number, active: number) =>
      `${name} · ${total} members (${active} active today)`,
    dashboard_no_checkin: "You haven't checked in today",
    dashboard_go_checkin: "Check in now →",
    dashboard_steps_today: "Today's Steps",
    dashboard_target: "Target",
    dashboard_wing_today: "Wing Today",
    dashboard_no_meals: "No meals logged today",
    dashboard_weight_progress: "Weight Progress",
    dashboard_streak: "Streak",
    dashboard_days: "days",
    dashboard_notif_text: "Enable notifications to receive SOS from friends",
    dashboard_notif_no: "Not now",
    dashboard_notif_yes: "Enable",

    // Checkin
    checkin_title: "Daily Check-in",
    checkin_retro: "✏️ Retroactive entry",
    checkin_water: "Water Intake",
    checkin_veg: "Vegetables",
    checkin_veg_sub: "Today's servings",
    checkin_ew: "Eating Window",
    checkin_ew_auto: "Back to auto",
    checkin_ew_manual: "Edit manually",
    checkin_ew_open: "Open",
    checkin_ew_close: "Close",
    checkin_ew_duration: "Duration",
    checkin_ew_waiting: "Waiting for next meal...",
    checkin_ew_open_label: "Window open",
    checkin_ew_close_label: "Window close",
    checkin_ew_hint: "Auto-calculated from meals logged today",
    checkin_ew_dur_label: (h: number) => `Duration: ${h} hours`,
    checkin_steps: "Steps",
    checkin_steps_ph: "How many steps today?",
    checkin_workout: "I worked out today",
    checkin_workout_dur: "Workout duration",
    checkin_workout_min: "min",
    checkin_workout_light: "Light",
    checkin_workout_moderate: "Moderate",
    checkin_workout_intense: "Intense",
    checkin_mood: "Mood",
    checkin_weight: "Weight Update",
    checkin_weight_unit: "kg",
    checkin_notes: "Free Notes",
    checkin_notes_ph: "How was your day? Anything to note...",
    checkin_save_m: "Save Check-in",
    checkin_save_f: "Save Check-in",
    checkin_update_m: "Update Check-in",
    checkin_update_f: "Update Check-in",
    checkin_saving_m: "Saving...",
    checkin_saving_f: "Saving...",
    checkin_close_day: "Close Day",
    checkin_closing_m: "Generating AI summary...",
    checkin_closing_f: "Generating AI summary...",
    checkin_saved_ok_m: "Check-in saved! 💪",
    checkin_saved_ok_f: "Check-in saved! 💪",
    checkin_day_summary: "Your Day Summary",
    checkin_hide_summary: "Hide summary",
    checkin_group: "Wing Today",
    checkin_no_checkin: "Hasn't checked in today",
    checkin_encourage_ph: (name: string) => `Encourage ${name}...`,
    checkin_reply_ph: "Reply / thank...",
    checkin_weight_ph: (w: number) => `Logged: ${w} kg`,

    // Challenges
    challenges_title: "Weekly Challenges",
    challenge_add: "+ Challenge",
    challenge_no_active: "No active challenge",
    challenge_no_active_member: "Create a new challenge for the wing",
    challenge_no_active_guest: "No challenge created yet",
    challenge_goal: "Goal",
    challenge_steps_unit: "steps",
    challenge_new: "New Challenge",
    challenge_name_label: "Challenge name",
    challenge_name_ph: "7 days of walking...",
    challenge_desc_label: "Description",
    challenge_desc_ph: "Everyone does...",
    challenge_target_label: "Target (number)",
    challenge_create_btn: "Create Challenge",
    challenge_created: "Challenge created! 🏆",
    challenge_error: "Failed to create challenge",
    ct_steps: "Steps goal",
    ct_water: "Water intake",
    ct_veg: "Daily veggies",
    ct_sugar: "No sugar",
    ct_cal: "Calorie goal",

    // Profile
    profile_title: "My Profile",
    profile_wing_btn: "My Wing",
    profile_my_data: "My Data",
    profile_age: "Age",
    profile_height: "Height",
    profile_weight: "Current weight",
    profile_target_weight: "Target weight",
    profile_gender: "Gender",
    profile_activity: "Activity level",
    profile_calculated: "Calculated Values",
    profile_bmi_base: "kcal base",
    profile_tdee_day: "kcal/day",
    profile_steps_goal: "Daily Steps Goal",
    profile_steps_unit: "steps/day",
    profile_save_goal: "Save Goal",
    profile_steps_invalid: "Invalid steps goal",
    profile_steps_saved: "Steps goal updated ✅",
    profile_uploading: "Uploading photo...",
    profile_photo_saved: "Profile photo updated ✅",
    profile_photo_error: "Failed to upload photo",
    profile_save_error: "Save failed",
    profile_signout: "Sign Out",
    gender_male: "Male",
    gender_female: "Female",
    activity_sedentary: "Sedentary",
    activity_light: "Light",
    activity_moderate: "Moderate",
    activity_active: "Active",
    activity_very_active: "Very active",

    // Meals
    meals_title: "My Meals",
    meals_all: "All",
    meals_photo: "Photo a Meal",
    meals_manual: "Add manually",
    meals_no_meals: "No meals yet",
    meals_add_first: "Take your first meal photo",
    meals_type_breakfast: "Breakfast",
    meals_type_lunch: "Lunch",
    meals_type_dinner: "Dinner",
    meals_type_snack: "Snack",
    meals_manual_title: "Manual Entry",
    meals_description: "Meal description",
    meals_calories: "Calories",
    meals_protein: "Protein (g)",
    meals_carbs: "Carbs (g)",
    meals_fat: "Fat (g)",
    meals_meal_type: "Meal type",
    meals_time: "Meal time",
    meals_save: "Save Meal",
    meals_saved: "Meal saved! 🥗",
    meals_save_error: "Failed to save meal",
    meals_today: "Today",

    // Steps / Calendar / Wing
    steps_title: "Leaderboard",
    calendar_title: "Calendar",
    wing_title: "My Wing",
  },
} as const;

export type TranslationKey = keyof (typeof T)["he"];

// ── Context ───────────────────────────────────────────────────────────────────

import React from "react";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: <K extends TranslationKey>(key: K) => (typeof T)["he"][K];
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LangCtx>({
  lang: "he",
  setLang: () => {},
  t: (key) => T.he[key],
  dir: "rtl",
});

function detectLang(): Lang {
  if (typeof window === "undefined") return "he";
  const stored = localStorage.getItem("lang") as Lang | null;
  if (stored === "he" || stored === "en") return stored;
  const nav = navigator.language ?? "";
  return nav.startsWith("he") ? "he" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "he" ? "rtl" : "ltr");
  }, [lang]);

  function setLang(l: Lang) {
    localStorage.setItem("lang", l);
    setLangState(l);
  }

  const t = <K extends TranslationKey>(key: K): (typeof T)["he"][K] =>
    (T[lang] as typeof T["he"])[key] ?? T.he[key];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir: lang === "he" ? "rtl" : "ltr" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
