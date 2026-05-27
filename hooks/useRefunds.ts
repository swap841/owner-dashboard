// hooks/useRefunds.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRefunds, createRefund, updateRefundStatus } from "../lib/firestore/refunds";
import { Refund } from "../types";

export function useRefunds() {
  const queryClient = useQueryClient();

  // 1. Query for Refunds list
  const refundsQuery = useQuery<Refund[], Error>({
    queryKey: ["refunds"],
    queryFn: getRefunds,
    staleTime: 30000,
  });

  // 2. Local Manual Refund Creation (e.g. COD/Manual record)
  const createRefundMutation = useMutation({
    mutationFn: (newRefund: Omit<Refund, "id" | "createdAt">) => createRefund(newRefund),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["activeOrders"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
    },
  });

  // 3. Process API-Driven Razorpay Refund
  const processRazorpayRefundMutation = useMutation({
    mutationFn: async ({
      paymentId,
      amount,
      reason,
      orderId,
      userId,
      items,
    }: {
      paymentId: string;
      amount: number;
      reason: string;
      orderId: string;
      userId: string;
      items: any[];
    }) => {
      const response = await fetch("/api/razorpay/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add auth bearer token if needed in production
        },
        body: JSON.stringify({
          paymentId,
          amount,
          reason,
          orderId,
          userId,
          items,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process Razorpay refund via API.");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["activeOrders"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
    },
  });

  return {
    refunds: refundsQuery.data || [],
    isLoading: refundsQuery.isLoading,
    isRefetching: refundsQuery.isRefetching,
    error: refundsQuery.error,
    refetch: refundsQuery.refetch,

    recordManualRefund: createRefundMutation.mutateAsync,
    isRecordingRefund: createRefundMutation.isPending,

    processRazorpayRefund: processRazorpayRefundMutation.mutateAsync,
    isProcessingRefund: processRazorpayRefundMutation.isPending,
  };
}
