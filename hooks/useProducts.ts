// hooks/useProducts.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getProducts, createProduct, updateProduct, deleteProduct, archiveProduct, restoreProduct, getArchivedProducts, importProductsFromCSV } from "../lib/firestore/products";
import { Product } from "../types";

export function useProducts() {
  const queryClient = useQueryClient();

  // 1. Fetch Products Query
  const productsQuery = useQuery<Product[], Error>({
    queryKey: ["products"],
    queryFn: getProducts,
    staleTime: 30000, // 30 seconds stale time
  });

  // 2. Create Product Mutation
  const createMutation = useMutation({
    mutationFn: (newProduct: Omit<Product, "id">) => createProduct(newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] }); // Categories are denormalized
    },
    onError: (error: Error) => {
      toast.error(`Failed to save product: ${error.message}`);
    },
  });

  // 3. Update Product Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) =>
      updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  // 4. Delete / Archive Product Mutation (soft-delete)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["archived-products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });

  // 5. Archive Product Mutation (explicit alias)
  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["archived-products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive product: ${error.message}`);
    },
  });

  // 6. Restore Product Mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["archived-products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore product: ${error.message}`);
    },
  });

  // 7. Archived Products Query
  const archivedProductsQuery = useQuery<Product[], Error>({
    queryKey: ["archived-products"],
    queryFn: getArchivedProducts,
    staleTime: 30000,
  });

  // 8. CSV Import Mutation
  const importCSVMutation = useMutation({
    mutationFn: (rows: Array<{
      name: string;
      price: number;
      mrp: number;
      stock: number;
      weight: number;
      unit: string;
      description: string;
      categoryName: string;
      imageUrl?: string;
    }>) => importProductsFromCSV(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to import products: ${error.message}`);
    },
  });

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    isRefetching: productsQuery.isRefetching,
    error: productsQuery.error,
    refetch: productsQuery.refetch,

    createProduct: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateProduct: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteProduct: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    archiveProduct: archiveMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,

    restoreProduct: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,

    archivedProducts: archivedProductsQuery.data || [],
    isArchivedLoading: archivedProductsQuery.isLoading,

    importCSVProducts: importCSVMutation.mutateAsync,
    isImporting: importCSVMutation.isPending,
  };
}
