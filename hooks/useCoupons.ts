import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "../lib/firestore/coupons";
import { Coupon } from "../types";

export function useCoupons() {
  const queryClient = useQueryClient();

  const couponsQuery = useQuery<Coupon[], Error>({
    queryKey: ["coupons"],
    queryFn: getCoupons,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (coupon: Omit<Coupon, "id">) => createCoupon(coupon),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save coupon: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Coupon> }) =>
      updateCoupon(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update coupon: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete coupon: ${error.message}`);
    },
  });

  return {
    coupons: couponsQuery.data || [],
    isLoading: couponsQuery.isLoading,
    error: couponsQuery.error,
    createCoupon: createMutation.mutateAsync,
    updateCoupon: updateMutation.mutateAsync,
    deleteCoupon: deleteMutation.mutateAsync,
  };
}
