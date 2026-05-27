import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  wingId?: string;
  profile: UserProfile;
  fcmToken?: string;
  timezone?: string;
  subscription?: Subscription;
  trophies?: Trophy[];
  createdAt: Timestamp;
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
  type: "steps" | "no_sugar" | "water" | "vegetables" | "calories";
  targetValue: number;
  startDate: string;
  endDate: string;
  progress: Record<string, number>; // userId → cumulative value (manual for no_sugar/calories)
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
