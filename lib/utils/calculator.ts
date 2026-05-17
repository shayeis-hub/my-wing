import type { UserProfile } from "@/types";

export function calculateBMR(profile: UserProfile): number {
  const { weightKg, heightCm, age, gender } = profile;
  if (gender === "male") {
    return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  }
  return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
}

const activityMultipliers: Record<UserProfile["activityLevel"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateTDEE(profile: UserProfile): number {
  return Math.round(calculateBMR(profile) * activityMultipliers[profile.activityLevel]);
}

export function calculateDailyTarget(profile: UserProfile): number {
  const tdee = calculateTDEE(profile);
  const deficit = profile.weightKg > profile.targetWeightKg ? 500 : 0;
  return Math.max(1200, tdee - deficit);
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "תת משקל", color: "text-blue-500" };
  if (bmi < 25) return { label: "משקל תקין", color: "text-green-500" };
  if (bmi < 30) return { label: "עודף משקל", color: "text-yellow-500" };
  return { label: "השמנת יתר", color: "text-red-500" };
}
