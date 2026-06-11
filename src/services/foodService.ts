import { apiFetch } from '@/lib/api';

export interface FoodPreference {
  userId: string;
  dislikedIngredients: string[];
  preferredCuisines: string[];
  spicyLevel: number;
  dietType: string;
  avgMealBudget: number | null;
}

export interface FridgeResult {
  detectedIngredients: string[];
  recipes: {
    name: string;
    cookTime: string;
    difficulty: string;
    estimatedCost: number;
    ingredients: string[];
    steps: string[];
    tags: string[];
  }[];
}

export interface MenuResult {
  menuItems: { name: string; price: number; description?: string }[];
  recommendations: {
    name: string;
    price: number;
    reason: string;
    tags: string[];
  }[];
}

export const foodService = {
  getPreference: () => apiFetch<FoodPreference>('/food/preference'),
  updatePreference: (data: Partial<FoodPreference>) =>
    apiFetch<FoodPreference>('/food/preference', { method: 'PATCH', body: JSON.stringify(data) }),
  fromFridge: (imageBase64: string, mimeType: string) =>
    apiFetch<FridgeResult>('/food/from-fridge', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) }),
  fromMenu: (imageBase64: string, mimeType: string, filter?: string) =>
    apiFetch<MenuResult>('/food/from-menu', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType, filter }) }),
};
