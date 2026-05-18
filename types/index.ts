import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  wingId?: string;
  profile: UserProfile;
  fcmToken?: string;
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
  mealTime?: string;
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

export interface Workout {
  done: boolean;
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
  progress: Record<string, number>;
  createdAt: Timestamp;
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
