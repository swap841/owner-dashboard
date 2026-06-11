// hooks/useOrders.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveOrders, updateOrderStatus, dispatchBasket, getAllOrdersGroup, normalizeOrder } from "../lib/firestore/orders";
import { Order, OrderStatus } from "../types";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";

export function useOrders() {
  const queryClient = useQueryClient();

  // 1. Shared query for ALL orders (used by orders, earnings, payments, dashboard)
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
    staleTime: 5 * 60 * 1000,
  });

  // 2. Query for Active Orders (derived from allOrders)
  const activeOrdersQuery = useQuery<Order[], Error>({
    queryKey: ["activeOrders"],
    queryFn: async () => {
      const allOrders = queryClient.getQueryData<Order[]>(["allOrders"]);
      if (allOrders) {
        const activeStatuses = ["Pending", "Packing", "Assigned", "Accepted", "Ready to Dispatch", "Out for Delivery", "Awaiting Verification"];
        return allOrders.filter((o) => activeStatuses.includes(o.status));
      }
      return (await getActiveOrders(100)).orders;
    },
    staleTime: 5 * 60 * 1000,
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
