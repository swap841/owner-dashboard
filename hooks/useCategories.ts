// hooks/useCategories.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../lib/firestore/categories";
import { Category } from "../types";

export function useCategories() {
  const queryClient = useQueryClient();

  // 1. Fetch Categories Query
  const categoriesQuery = useQuery<Category[], Error>({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 30000,
  });

  // 2. Create Category Mutation
  const createMutation = useMutation({
    mutationFn: (newCat: Omit<Category, "id">) => createCategory(newCat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  // 3. Update Category Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) =>
      updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  // 4. Delete Category Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // Products might lose cat reference
    },
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    isRefetching: categoriesQuery.isRefetching,
    error: categoriesQuery.error,
    refetch: categoriesQuery.refetch,

    createCategory: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateCategory: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteCategory: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
