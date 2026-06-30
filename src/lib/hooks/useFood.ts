'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  foodService,
  FoodPreference,
  FoodBudgetInfo,
  FoodFavorite,
  FoodHistoryItem,
} from '@/services/foodService';

// ─── Query Keys ─────────────────────────────────────────────
export const foodKeys = {
  all: ['food'] as const,
  budget: () => ['food', 'budget'] as const,
  preference: () => ['food', 'preference'] as const,
  favorites: () => ['food', 'favorites'] as const,
  history: (limit?: number) => ['food', 'history', limit] as const,
  ratings: () => ['food', 'ratings'] as const,
};

// ─── Queries ────────────────────────────────────────────────

export function useFoodBudget() {
  return useQuery({
    queryKey: foodKeys.budget(),
    queryFn: () => foodService.getRemainingBudget().catch(() => null),
    staleTime: 60_000,
  });
}

export function useFoodPreference() {
  return useQuery({
    queryKey: foodKeys.preference(),
    queryFn: () => foodService.getPreference(),
    staleTime: 5 * 60_000,
  });
}

export function useFoodFavorites(enabled: boolean) {
  return useQuery({
    queryKey: foodKeys.favorites(),
    queryFn: () => foodService.getFavorites(),
    enabled,
    staleTime: 30_000,
  });
}

export function useFoodHistory(enabled: boolean, limit = 30) {
  return useQuery({
    queryKey: foodKeys.history(limit),
    queryFn: () => foodService.getHistory(limit),
    enabled,
    staleTime: 30_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useUpdateFoodPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FoodPreference>) => foodService.updatePreference(data),
    onSuccess: (updated) => {
      qc.setQueryData(foodKeys.preference(), updated);
    },
  });
}

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeName, recipeData }: { recipeName: string; recipeData: string }) =>
      foodService.addFavorite(recipeName, recipeData),
    onSuccess: (fav) => {
      qc.setQueryData<FoodFavorite[]>(foodKeys.favorites(), (prev) => [fav, ...(prev ?? [])]);
    },
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => foodService.removeFavorite(id),
    onSuccess: (_, id) => {
      qc.setQueryData<FoodFavorite[]>(foodKeys.favorites(), (prev) => (prev ?? []).filter(f => f.id !== id));
    },
  });
}

export function useRateRecipe() {
  return useMutation({
    mutationFn: ({ historyId, rating, feedback }: { historyId: string; rating: number; feedback?: string }) =>
      foodService.rateRecipe(historyId, rating, feedback),
  });
}

// ─── Invalidation helper ────────────────────────────────────
export function useInvalidateFood() {
  const qc = useQueryClient();
  return {
    invalidateBudget: () => qc.invalidateQueries({ queryKey: foodKeys.budget() }),
    invalidateAll: () => qc.invalidateQueries({ queryKey: foodKeys.all }),
  };
}
