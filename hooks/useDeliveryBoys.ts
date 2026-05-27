// hooks/useDeliveryBoys.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDeliveryBoys, createDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy, clearOrderFromDriverBasket } from "../lib/firestore/deliveryBoys";
import { DeliveryBoy } from "../types";

export function useDeliveryBoys() {
  const queryClient = useQueryClient();

  // 1. Fetch Delivery Boys Query
  const deliveryBoysQuery = useQuery<DeliveryBoy[], Error>({
    queryKey: ["deliveryBoys"],
    queryFn: getDeliveryBoys,
    staleTime: 30000,
  });

  // 2. Create Delivery Boy Mutation
  const createMutation = useMutation({
    mutationFn: (newBoy: Omit<DeliveryBoy, "id" | "basket">) => createDeliveryBoy(newBoy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryBoys"] });
    },
  });

  // 3. Update Delivery Boy Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DeliveryBoy> }) =>
      updateDeliveryBoy(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryBoys"] });
    },
  });

  // 4. Delete Delivery Boy Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDeliveryBoy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryBoys"] });
    },
  });

  // 5. Clear Basket Item Mutation
  const clearBasketItemMutation = useMutation({
    mutationFn: ({ dboyId, orderId }: { dboyId: string; orderId: string }) =>
      clearOrderFromDriverBasket(dboyId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryBoys"] });
    },
  });

  return {
    deliveryBoys: deliveryBoysQuery.data || [],
    isLoading: deliveryBoysQuery.isLoading,
    isRefetching: deliveryBoysQuery.isRefetching,
    error: deliveryBoysQuery.error,
    refetch: deliveryBoysQuery.refetch,

    createDeliveryBoy: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateDeliveryBoy: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteDeliveryBoy: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    clearBasketItem: clearBasketItemMutation.mutateAsync,
    isClearingBasketItem: clearBasketItemMutation.isPending,
  };
}
