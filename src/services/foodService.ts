import { apiFetch } from '@/lib/api';

export interface FoodPreference {
  userId: string;
  dislikedIngredients: string[];
  preferredCuisines: string[];
  spicyLevel: number;
  dietType: string;
  avgMealBudget: number | null;
}

export interface FridgeRecipe {
  name: string;
  cookTime: string;
  difficulty: string;
  estimatedCost: number;
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
    tags: string[];
  }[];
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
};
