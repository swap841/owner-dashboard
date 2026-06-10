// hooks/useOrders.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveOrders, updateOrderStatus, dispatchBasket, getAllOrdersGroup, normalizeOrder } from "../lib/firestore/orders";
import { Order, OrderStatus } from "../types";

export function useOrders() {
  const queryClient = useQueryClient();

  // 1. Query for Active Orders (Pending, Processing, etc.)
  const activeOrdersQuery = useQuery<Order[], Error>({
    queryKey: ["activeOrders"],
    queryFn: async () => {
      try {
        const result = await getActiveOrders();
        return result.orders;
      } catch (err) {
        console.error("Failed to fetch active orders:", err);
        throw err;
      }
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // 2. Query for ALL Orders (Unfiltered, used for analytics and earnings)
  const allOrdersQuery = useQuery<Order[], Error>({
    queryKey: ["allOrders"],
    queryFn: async () => {
      try {
        return await getAllOrdersGroup();
      } catch (err) {
        console.error("Failed to fetch all orders:", err);
        throw err;
      }
    },
    staleTime: 60000,
  });

  // 3. Update Order Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      userId,
      orderId,
      status,
      extraFields = {},
    }: {
      userId: string;
      orderId: string;
      status: OrderStatus;
      extraFields?: Partial<Order>;
    }) => updateOrderStatus(userId, orderId, status, extraFields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeOrders"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoys"] });
    },
  });

  // 4. Dispatch Basket Mutation
  const dispatchBasketMutation = useMutation({
    mutationFn: ({
      basket,
      dboyId,
      dboyName,
    }: {
      basket: any;
      dboyId: string;
      dboyName: string;
    }) => dispatchBasket(basket, dboyId, dboyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeOrders"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoys"] });
    },
  });

  return {
    activeOrders: activeOrdersQuery.data || [],
    isActiveOrdersLoading: activeOrdersQuery.isLoading,
    isActiveOrdersRefetching: activeOrdersQuery.isRefetching,
    activeOrdersError: activeOrdersQuery.error,
    refetchActiveOrders: activeOrdersQuery.refetch,

    allOrders: allOrdersQuery.data || [],
    isAllOrdersLoading: allOrdersQuery.isLoading,
    allOrdersError: allOrdersQuery.error,
    refetchAllOrders: allOrdersQuery.refetch,

    updateOrderStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,

    dispatchBasket: dispatchBasketMutation.mutateAsync,
    isDispatching: dispatchBasketMutation.isPending,
  };
}
