// hooks/useOrders.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveOrders, updateOrderStatus, dispatchBasket, getAllOrdersGroup, normalizeOrder } from "../lib/firestore/orders";
import { Order, OrderStatus } from "../types";
import { collectionGroup, getDocs, getFirestore, query } from "firebase/firestore";
import { app } from "../firebaseConfig";

const db = getFirestore(app);

export function useOrders() {
  const queryClient = useQueryClient();

  // 1. Query for Active Orders (Pending, Processing, etc.)
  const activeOrdersQuery = useQuery<Order[], Error>({
    queryKey: ["activeOrders"],
    queryFn: async () => {
      const result = await getActiveOrders(null, 100); // Fetch top 100 active for caching
      return result.orders;
    },
    staleTime: 30000, // 30 seconds stale time
    refetchInterval: 30000, // Automatic poll every 30 seconds
  });

  // 2. Query for ALL Orders (Unfiltered, used for analytics and earnings)
  const allOrdersQuery = useQuery<Order[], Error>({
    queryKey: ["allOrders"],
    queryFn: async () => {
      return await getAllOrdersGroup();
    },
    staleTime: 60000, // 1 minute stale time for analytics
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
      queryClient.invalidateQueries({ queryKey: ["deliveryBoys"] }); // Delivery boy basket may change
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
