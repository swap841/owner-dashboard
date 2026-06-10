import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getBanners, createBanner, updateBanner, deleteBanner } from "../lib/firestore/banners";
import { Banner } from "../types";

export function useBanners() {
  const queryClient = useQueryClient();

  const bannersQuery = useQuery<Banner[], Error>({
    queryKey: ["banners"],
    queryFn: getBanners,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (banner: Omit<Banner, "id">) => createBanner(banner),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banners"] }),
    onError: (error: Error) => {
      toast.error(`Failed to save banner: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Banner> }) =>
      updateBanner(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banners"] }),
    onError: (error: Error) => {
      toast.error(`Failed to update banner: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banners"] }),
    onError: (error: Error) => {
      toast.error(`Failed to delete banner: ${error.message}`);
    },
  });

  return {
    banners: bannersQuery.data || [],
    isLoading: bannersQuery.isLoading,
    error: bannersQuery.error,
    createBanner: createMutation.mutateAsync,
    updateBanner: updateMutation.mutateAsync,
    deleteBanner: deleteMutation.mutateAsync,
  };
}
