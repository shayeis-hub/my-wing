// ── Workout model ────────────────────────────────────────────────────────────
// Two input models:
//   • "distance" sports (running/walking/cycling/swimming/rowing): if the user
//     enters a distance we DERIVE intensity from speed/pace — far more accurate
//     than a subjective "how hard". Distance is optional; without it we fall back
//     to the intensity table.
//   • "duration" sports (strength/HIIT/spinning/…): time + intensity is correct.
// Calories are always MET × weightKg × hours (running uses a distance formula).

export type Intensity = "light" | "moderate" | "intense";

export interface Sport {
  value: string;
  he: string;
  en: string;
  model: "distance" | "duration";
  /** Unit for the optional distance input (distance sports only). */
  distanceUnit?: "km" | "m";
  /** Fallback MET [light, moderate, intense] — used for duration sports, and for
   *  distance sports when no distance was entered. */
  met: [number, number, number];
  /** Speed(km/h) → MET, for distance sports when a distance IS entered.
   *  Running is special-cased (distance formula) and needs none. */
  speedMet?: (kmh: number) => number;
}

export const SPORTS: Sport[] = [
  // Distance sports
  { value: "running",  he: "ריצה",              en: "Running",       model: "distance", distanceUnit: "km", met: [8, 11, 14] },
  { value: "walking",  he: "הליכה",             en: "Walking",       model: "distance", distanceUnit: "km", met: [2.8, 3.5, 5.0],
    speedMet: (k) => (k < 3.2 ? 2.0 : k < 4.0 ? 2.8 : k < 4.8 ? 3.5 : k < 5.6 ? 4.3 : k < 6.4 ? 5.0 : 6.3) },
  { value: "cycling",  he: "אופניים",           en: "Cycling",       model: "distance", distanceUnit: "km", met: [4, 8, 12],
    speedMet: (k) => (k < 16 ? 4 : k < 19 ? 6 : k < 22 ? 8 : k < 25 ? 10 : k < 30 ? 12 : 15.8) },
  { value: "swimming", he: "שחייה",             en: "Swimming",      model: "distance", distanceUnit: "m",  met: [6, 8, 10] },
  { value: "rowing",   he: "חתירה",             en: "Rowing",        model: "distance", distanceUnit: "km", met: [6, 7, 8.5],
    speedMet: (k) => (k < 8 ? 6 : k < 10 ? 7 : k < 12 ? 8.5 : 10) },
  // Duration sports
  { value: "spinning", he: "ספינינג",           en: "Spinning",      model: "duration", met: [6, 8.5, 11] },
  { value: "weights",  he: "אימון כוח",          en: "Strength",      model: "duration", met: [3.5, 5, 6] },
  { value: "hiit",     he: "HIIT / אינטרוולים",  en: "HIIT",          model: "duration", met: [8, 10, 12] },
  { value: "crossfit", he: "קרוספיט",           en: "CrossFit",      model: "duration", met: [8, 10, 12] },
  { value: "aerobics", he: "אירובי / חוגי כושר", en: "Aerobics",      model: "duration", met: [5, 6.5, 7.5] },
  { value: "yoga",     he: "יוגה / פילאטיס",     en: "Yoga / Pilates", model: "duration", met: [2.5, 3, 4] },
  { value: "team",     he: "ספורט קבוצתי",       en: "Team sport",    model: "duration", met: [6, 8, 10] },
  { value: "racket",   he: "ספורט מחבט",         en: "Racket sport",  model: "duration", met: [5, 7, 8] },
  { value: "other",    he: "אחר",               en: "Other",         model: "duration", met: [4, 6, 8] },
];

export function getSport(type: string): Sport {
  return SPORTS.find((s) => s.value === type) ?? SPORTS[SPORTS.length - 1];
}

const INTENSITY_INDEX: Record<Intensity, number> = { light: 0, moderate: 1, intense: 2 };

export interface WorkoutInput {
  type: string;
  durationMin: number;
  weightKg: number;
  intensity?: Intensity;
  /** Distance in the sport's unit (km, or metres for swimming). */
  distance?: number;
}

/** True when this sport+input should be computed from distance (not intensity). */
export function usesDistance(type: string, distance?: number): boolean {
  const s = getSport(type);
  return s.model === "distance" && !!distance && distance > 0;
}

/** Speed in km/h for a distance sport (metres normalised to km for swimming). */
export function speedKmh(type: string, distance: number, durationMin: number): number {
  if (!durationMin) return 0;
  const s = getSport(type);
  const km = s.distanceUnit === "m" ? distance / 1000 : distance;
  return km / (durationMin / 60);
}

export function computeWorkoutCalories(input: WorkoutInput): number {
  const { type, durationMin, weightKg, intensity = "moderate", distance } = input;
  const s = getSport(type);
  const hours = durationMin / 60;

  if (usesDistance(type, distance) && distance) {
    // Running: distance formula (~1.03 kcal per kg per km), pace-independent.
    if (type === "running") return Math.round(1.03 * weightKg * distance);
    // Others: derive speed → MET.
    if (s.speedMet) {
      const met = s.speedMet(speedKmh(type, distance, durationMin));
      return Math.round(met * weightKg * hours);
    }
    // Swimming: MET from pace per 100m.
    if (type === "swimming") {
      const per100 = durationMin * 60 / (distance / 100); // seconds / 100m
      const met = per100 < 100 ? 10 : per100 < 150 ? 8.3 : per100 < 200 ? 7 : 6;
      return Math.round(met * weightKg * hours);
    }
  }

  // Fallback: intensity table.
  const met = s.met[INTENSITY_INDEX[intensity]];
  return Math.round(met * weightKg * hours);
}

/** Human pace/speed feedback for the entered distance + time, per sport. */
export function paceFeedback(type: string, distance: number, durationMin: number, lang: "he" | "en"): string {
  if (!distance || !durationMin) return "";
  const s = getSport(type);
  const isHe = lang === "he";

  if (type === "swimming") {
    const per100 = durationMin / (distance / 100); // minutes per 100m
    const mm = Math.floor(per100);
    const ss = Math.round((per100 - mm) * 60);
    return `${mm}:${String(ss).padStart(2, "0")} ${isHe ? "לׁ-100 מ'" : "/100m"}`;
  }
  if (type === "cycling" || type === "rowing") {
    return `${speedKmh(type, distance, durationMin).toFixed(1)} ${isHe ? "קמ\"ש" : "km/h"}`;
  }
  // running / walking → pace min/km
  const paceMin = durationMin / distance;
  const mm = Math.floor(paceMin);
  const ss = Math.round((paceMin - mm) * 60);
  return `${mm}:${String(ss).padStart(2, "0")} ${isHe ? "דק'/ק\"מ" : "min/km"}`;
}

// ── Step double-count guard ──────────────────────────────────────────────────
// Running/walking workouts already produce their calories, so the steps they
// generated must NOT be counted again in the "add steps to budget" feature.

const STEPS_PER_KM: Record<string, number> = { running: 1150, walking: 1400 };
const STEPS_PER_MIN: Record<string, number> = { running: 155, walking: 115 };

interface StepishWorkout {
  type?: string;
  durationMinutes?: number;
  distanceKm?: number;
}

/** Estimated steps produced by a single foot workout (0 for non-foot sports). */
export function estimateWorkoutSteps(w: StepishWorkout): number {
  const type = w.type ?? "";
  if (type !== "running" && type !== "walking") return 0;
  if (w.distanceKm && w.distanceKm > 0) return Math.round(w.distanceKm * STEPS_PER_KM[type]);
  if (w.durationMinutes && w.durationMinutes > 0) return Math.round(w.durationMinutes * STEPS_PER_MIN[type]);
  return 0;
}

/** Total steps already accounted for by today's foot workouts. */
export function stepsFromWorkouts(workouts: StepishWorkout[] | undefined, legacy?: StepishWorkout): number {
  const list = workouts?.length ? workouts : legacy ? [legacy] : [];
  return list.reduce((sum, w) => sum + estimateWorkoutSteps(w), 0);
}
