import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Banner> }) =>
      updateBanner(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banners"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banners"] }),
  });

  return {
    banners: bannersQuery.data || [],
    isLoading: bannersQuery.isLoading,
    createBanner: createMutation.mutateAsync,
    updateBanner: updateMutation.mutateAsync,
    deleteBanner: deleteMutation.mutateAsync,
  };
}
