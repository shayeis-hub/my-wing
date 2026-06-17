import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  wingId?: string;
  wingIds?: string[];
  profile: UserProfile;
  fcmToken?: string;
  timezone?: string;
  subscription?: Subscription;
  courseAccess?: { expiresAt: string; wingId: string };
  /** "business" unlocks the coach management dashboard. Defaults to personal. */
  accountType?: "personal" | "business";
  /** Coach (business) subscription state — present on business accounts. */
  coach?: CoachAccount;
  /**
   * A paid plan the coach started checking out but hasn't completed yet.
   * Kept separate from `coach` so an abandoned PayPal checkout never overwrites
   * the live (e.g. free-trial) plan. Promoted to `coach` only once PayPal confirms.
   */
  coachCheckout?: { plan: CoachPlan; maxClients: number | null; paypalSubscriptionId: string };
  /** Granted to a coach's client; full access while the coach's plan is active. */
  coachAccess?: { coachId: string; wingId: string; active: boolean };
  /**
   * Overrides createdAt as the trial clock start. Defaults to createdAt.
   * Set to "now" when a coach stops paying, so the client's 14-day trial begins then.
   */
  trialStartsAt?: string;
  trophies?: Trophy[];
  createdAt: Timestamp;
}

export type CoachPlan = "free" | "basic" | "extended" | "unlimited";

export interface CoachAccount {
  plan: CoachPlan;
  /** Max clients allowed by the plan. null = unlimited. */
  maxClients: number | null;
  active: boolean;
  /** Free-trial expiry (ISO). Set only for the free plan; paid plans omit it. */
  expiresAt?: string;
  paypalSubscriptionId?: string;
  cancelPending?: boolean;
  status?: string;
}

export interface UserProfile {
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  gender: "male" | "female";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  dailyCalorieTarget: number;
  stepsGoal?: number;
}

export interface Wing {
  id: string;
  name: string;
  ownerId: string;
  /** Co-admins (besides the owner) who share management rights. */
  adminIds?: string[];
  memberIds: string[];
  members: WingMember[];
  inviteToken: string;
  createdAt: Timestamp;
  activeChallenge?: Challenge;
}

export interface WingMember {
  uid: string;
  displayName: string;
  photoURL?: string;
  stepsToday?: number;
}

export interface Meal {
  id: string;
  wingId: string;
  userId: string;
  userName: string;
  imageURL?: string;
  analysis: MealAnalysis;
  notes?: string;
  comments?: Encouragement[];
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  mealTime?: string;   // "HH:mm"
  mealDate?: string;   // "yyyy-MM-dd" — explicit date, falls back to createdAt date
  reactions?: Reaction[];
  createdAt: Timestamp;
}

export interface MealAnalysis {
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  items: FoodItem[];
  healthScore: number;
  tips?: string;
  containsVegetables?: boolean;
}

export interface FoodItem {
  name: string;
  estimatedGrams: number;
  calories: number;
}

export interface Encouragement {
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
  reactions?: Reaction[];
}

export type ReactionType = "heart" | "flame" | "sparkles" | "trophy";

export interface Reaction {
  userId: string;
  userName: string;
  type: ReactionType;
  createdAt: number;
}

export interface PromptResponse {
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

export interface DailyPrompt {
  id: string;
  wingId: string;
  date: string;            // "yyyy-MM-dd"
  question: string;        // Localized question shown to wing
  questionId: number;      // Index into the curated list, for reproducibility
  responses?: PromptResponse[];
  reactions?: Reaction[];
  createdAt: Timestamp;
}

export interface WingPost {
  id: string;
  wingId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  text?: string;              // Optional text content (one of text/image required)
  imageURL?: string;          // Optional image
  reactions?: Reaction[];
  comments?: Encouragement[];
  createdAt: Timestamp;
}

export interface Workout {
  done: boolean;
  type?: string;
  intensity?: "light" | "moderate" | "intense";
  durationMinutes?: number;
  description?: string;
  caloriesBurned?: number;
}

export interface DailyCheckin {
  id: string;
  wingId: string;
  userId: string;
  userName: string;
  date: string;
  waterGlasses: number;
  vegetablesServings: number;
  mood: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  steps?: number;
  workout?: Workout;
  weightKg?: number;
  encouragements?: Encouragement[];
  reactions?: Reaction[];
  daySummary?: { summary: string; insights: string[]; tip: string };
  eatingWindow?: { open: string; close: string; durationHours: number };
  createdAt: Timestamp;
}

export interface WeightLog {
  id: string;
  userId: string;
  userName: string;
  date: string;
  weightKg: number;
  createdAt: Timestamp;
}

export interface StepsEntry {
  id: string;
  wingId: string;
  userId: string;
  userName: string;
  date: string;
  steps: number;
  createdAt: Timestamp;
}

export interface Challenge {
  id: string;
  wingId: string;
  title: string;
  description: string;
  // "calories" is legacy (no longer offered on creation); "other" is a free-form
  // manual challenge in any domain the admin chooses.
  type: "steps" | "no_sugar" | "water" | "vegetables" | "calories" | "other";
  /** Custom unit label for "other" challenges (e.g. "ק"מ", "דקות"). */
  unit?: string;
  targetValue: number;   // daily target (per day)
  startDate: string;
  endDate: string;
  progress: Record<string, number>; // userId → cumulative value (manual for no_sugar/other)
  status?: "active" | "finished";
  winners?: string[]; // [gold_uid, silver_uid, bronze_uid]
  createdAt: Timestamp;
}

export interface Trophy {
  challengeId: string;
  challengeTitle: string;
  challengeType: Challenge["type"];
  medal: "gold" | "silver" | "bronze";
  endDate: string;
  wingId: string;
}

export interface AISummary {
  id: string;
  wingId: string;
  type: "daily" | "weekly";
  date: string;
  content: string;
  highlights: string[];
  motivationMessages: Record<string, string>;
  createdAt: Timestamp;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Subscription {
  plan: "free" | "premium" | "grandfathered";
  expiresAt?: Timestamp;
  paddleCustomerId?: string;
  paddleSubscriptionId?: string;
  provider?: "paddle" | "grandfathered";
  cancelPending?: boolean;
}

export interface DailyUsage {
  mealPhotos: number;
  date: string;
}
