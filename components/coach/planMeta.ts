export type PlanMetaId = "basic" | "extended" | "unlimited";

// Display metadata for the paid dietitian plans (the free trial is shown separately).
export const PLAN_META: Record<
  PlanMetaId,
  { name: string; tagline: Record<"he" | "en", string>; clients: Record<"he" | "en", string>; recommended?: boolean }
> = {
  basic: {
    name: "Starter",
    tagline: { he: "להתחלה — ליווי קבוצה קטנה או כמה לקוחות פרטיים", en: "To get started — a small group or a few private clients" },
    clients: { he: "עד 10 לקוחות", en: "Up to 10 clients" },
  },
  extended: {
    name: "Premium",
    tagline: { he: "לדיאטנ/ית עם מספר קבוצות ולקוחות פרטיים", en: "For dietitians with several groups and private clients" },
    clients: { he: "עד 30 לקוחות", en: "Up to 30 clients" },
  },
  unlimited: {
    name: "Business",
    tagline: { he: "לפרקטיקה גדולה — לקוחות ללא הגבלה", en: "For a large practice — unlimited clients" },
    clients: { he: "לקוחות ללא הגבלה", en: "Unlimited clients" },
    recommended: true,
  },
};

export const PLAN_FEATURES: Record<"he" | "en", string>[] = [
  { he: "דף ניהול לקוחות מלא", en: "Full client-management dashboard" },
  { he: "קישורי הזמנה פרטיים וקבוצתיים", en: "Private and group invite links" },
  { he: "גישת פרימיום מלאה לכל הלקוחות", en: "Full premium access for all clients" },
  { he: "מעקב ארוחות, צ'ק-אפ והודעות לכל לקוח", en: "Meal, check-in and message tracking for every client" },
];
