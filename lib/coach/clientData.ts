/** Everything a client entered, shaped for the dietitian's "data" screen. */

export interface ClientDataMeal {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | string;
  time?: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  healthScore?: number;
  notes?: string;
  imageURL?: string;
  menuMatch?: { slot?: string; status: string; score: number; note: string };
}

export interface ClientDataWorkout {
  type?: string;
  intensity?: string;
  durationMinutes?: number;
  distanceKm?: number;
  description?: string;
  caloriesBurned?: number;
}

export interface ClientDataCheckin {
  waterGlasses?: number;
  vegetablesServings?: number;
  mood?: number;
  steps?: number;
  weightKg?: number;
  notes?: string;
  workouts: ClientDataWorkout[];
  eatingWindow?: { open: string; close: string; durationHours: number };
  daySummary?: { summary: string; insights: string[]; tip: string };
}

export interface ClientDataDay {
  date: string; // yyyy-MM-dd
  checkin: ClientDataCheckin | null;
  meals: ClientDataMeal[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: number | null;
  weightKg: number | null;
}

export interface ClientDataResponse {
  clientName: string;
  today: string;
  days: ClientDataDay[]; // newest first, one entry per calendar day in range
  weights: { date: string; kg: number }[]; // oldest first, whole history
  targets: { calories: number | null; steps: number | null; weightKg: number | null; heightCm: number | null };
}
