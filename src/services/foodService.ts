import { apiFetch } from '@/lib/api';

export interface FoodPreference {
  userId: string;
  dislikedIngredients: string[];
  preferredCuisines: string[];
  spicyLevel: number;
  dietType: string;
  avgMealBudget: number | null;
  calorieLimit: number | null;
  proteinTarget: number | null;
  healthGoals: string[];
  allergies: string[];
  breakfastHabit: string | null;
  lunchHabit: string | null;
  dinnerHabit: string | null;
  snackHabit: string | null;
}

export interface FridgeRecipe {
  name: string;
  cookTime: string;
  difficulty: string;
  estimatedCost: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients: string[];
  steps: string[];
  tags: string[];
}

export interface FridgeResult {
  detectedIngredients: string[];
  recipes: FridgeRecipe[];
}

export interface MenuResult {
  menuItems: { name: string; price: number; description?: string }[];
  recommendations: {
    name: string;
    price: number;
    reason: string;
    calories?: number;
    tags: string[];
  }[];
}

export interface MealPlanDay {
  day: number;
  totalCalories?: number;
  meals: {
    type: 'breakfast' | 'lunch' | 'dinner';
    name: string;
    estimatedCost: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    tags: string[];
    note?: string;
    healthNote?: string;
  }[];
}

export interface MealPlanResult {
  dailyBudget: number;
  totalEstimatedCost: number;
  dailyCalorieTarget?: number;
  days: MealPlanDay[];
}

export interface FoodRating {
  id: string;
  userId: string;
  historyId: string;
  rating: number;
  feedback?: string;
  createdAt: string;
}

export interface FoodBudgetInfo {
  budget: number;
  spent: number;
  remaining: number | null;
}

export interface FoodFavorite {
  id: string;
  userId: string;
  recipeName: string;
  recipeData: string; // JSON serialized recipe
  createdAt: string;
}

export interface FoodHistoryItem {
  id: string;
  userId: string;
  recipeName: string;
  budget: number | null;
  recipeData?: string;
  sourceType?: string;
  createdAt: string;
}

export const foodService = {
  getPreference: () => apiFetch<FoodPreference>('/food/preference'),
  updatePreference: (data: Partial<FoodPreference>) =>
    apiFetch<FoodPreference>('/food/preference', { method: 'PATCH', body: JSON.stringify(data) }),
  fromFridge: (imageBase64: string, mimeType: string) =>
    apiFetch<FridgeResult>('/food/from-fridge', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) }),
  fromMenu: (imageBase64: string, mimeType: string, filter?: string) =>
    apiFetch<MenuResult>('/food/from-menu', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType, filter }) }),

  // Budget integration
  getRemainingBudget: () => apiFetch<FoodBudgetInfo>('/food/remaining-budget'),

  // Favorites
  getFavorites: () => apiFetch<FoodFavorite[]>('/food/favorites'),
  addFavorite: (recipeName: string, recipeData: string) =>
    apiFetch<FoodFavorite>('/food/favorites', { method: 'POST', body: JSON.stringify({ recipeName, recipeData }) }),
  removeFavorite: (id: string) =>
    apiFetch<{ success: boolean }>(`/food/favorites/${id}`, { method: 'DELETE' }),

  // History
  getHistory: (limit?: number) =>
    apiFetch<FoodHistoryItem[]>(`/food/history${limit ? `?limit=${limit}` : ''}`),

  // Text-based ingredient mode
  fromText: (ingredients: string[]) =>
    apiFetch<FridgeResult>('/food/from-text', { method: 'POST', body: JSON.stringify({ ingredients }) }),

  // Rating
  rateRecipe: (historyId: string, rating: number, feedback?: string) =>
    apiFetch<FoodRating>('/food/rate', { method: 'POST', body: JSON.stringify({ historyId, rating, feedback }) }),
  getMyRatings: () => apiFetch<FoodRating[]>('/food/ratings'),

  // Weekly Meal Plan
  generateMealPlan: (days = 7) =>
    apiFetch<MealPlanResult>('/food/meal-plan', { method: 'POST', body: JSON.stringify({ days }) }),
};
