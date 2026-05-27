// components/RefundModal.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Order } from "../types";

interface RefundItem {
  productId: string;
  name: string;
  quantity: number;
  refundAmount: number;
}
import { X, Loader2, IndianRupee, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface RefundModalProps {
  order: Order;
  onClose: () => void;
  onRefundProcessed: (refundPayload: {
    paymentId: string;
    amount: number;
    reason: string;
    orderId: string;
    userId: string;
    items: RefundItem[];
  }, isRazorpay: boolean) => Promise<any>;
}

export default function RefundModal({ order, onClose, onRefundProcessed }: RefundModalProps) {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Initialize state: all items selected by default with their purchase quantities
    const itemsState: Record<string, boolean> = {};
    const qtyState: Record<string, number> = {};

    order.items.forEach((item) => {
      const itemId = item.productId || "unknown";
      itemsState[itemId] = true;
      qtyState[itemId] = item.quantity;
    });

    setSelectedItems(itemsState);
    setRefundQuantities(qtyState);
  }, [order]);

  const handleToggleItem = (productId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleQuantityChange = (productId: string, maxQty: number, val: number) => {
    const qty = Math.max(1, Math.min(maxQty, val));
    setRefundQuantities((prev) => ({
      ...prev,
      [productId]: qty,
    }));
  };

  // Calculate total refund amount
  const calculateTotalRefund = () => {
    return order.items.reduce((sum, item) => {
      const itemId = item.productId || "unknown";
      if (selectedItems[itemId]) {
        const qty = refundQuantities[itemId] || 0;
        return sum + qty * item.price;
      }
      return sum;
    }, 0);
  };

  const totalRefundAmount = calculateTotalRefund();
  const isRazorpayOrder = order.payment?.method === "razorpay";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!reason.trim()) {
      return toast.error("Please enter a reason for the refund.");
    }

    const itemsToRefund: RefundItem[] = [];
    order.items.forEach((item) => {
      const itemId = item.productId || "unknown";
      if (selectedItems[itemId]) {
        const qty = refundQuantities[itemId] || 0;
        itemsToRefund.push({
          productId: itemId,
          name: item.name,
          quantity: qty,
          refundAmount: qty * item.price,
        });
      }
    });

    if (itemsToRefund.length === 0) {
      return toast.error("Please select at least one item to refund.");
    }

    if (totalRefundAmount <= 0) {
      return toast.error("Refund amount must be greater than zero.");
    }

    setSubmitting(true);
    const toastId = toast.loading(
      isRazorpayOrder
        ? "Processing secure Razorpay gateway refund..."
        : "Recording manual dashboard refund..."
    );

    try {
      const payload = {
        paymentId: order.payment?.razorpayPaymentId || "manual_cod_payment",
        amount: totalRefundAmount,
        reason: reason.trim(),
        orderId: order.id || "",
        userId: order.userId,
        items: itemsToRefund,
      };

      await onRefundProcessed(payload, isRazorpayOrder);
      toast.success("Refund processed and order status updated successfully!", { id: toastId });
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process refund. Ensure configurations are set.", {
        id: toastId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/85 overflow-hidden flex flex-col transition-all max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
              <span>🔁 Order Refund</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                ID: {order.id?.substring(0, 8)}...
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Paid via {order.payment?.method === "razorpay" ? "Razorpay Gateway" : "Cash on Delivery"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Warning Banner */}
          {order.status !== "Delivered" && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-3 rounded-r-xl flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">
                Warning: Typically, refunds are issued on Delivered orders. This order status is currently "{order.status}".
              </div>
            </div>
          )}

          {/* Items Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
              Select items & quantities to refund
            </label>
            <div className="space-y-2 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/10 max-h-48 overflow-y-auto">
              {order.items.map((item) => {
                const itemId = item.productId || "unknown";
                const isChecked = !!selectedItems[itemId];
                const refundQty = refundQuantities[itemId] || 1;

                return (
                  <div
                    key={itemId}
                    className="flex items-center justify-between gap-4 p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700/50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleItem(itemId)}
                        className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-semibold">
                          ₹{item.price.toFixed(2)} each • {item.quantity} purchased
                        </span>
                      </div>
                    </div>

                    {isChecked && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-zinc-400">Qty:</span>
                        <input
                          type="number"
                          value={refundQty}
                          min={1}
                          max={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(itemId, item.quantity, Number(e.target.value))
                          }
                          className="w-12 text-center py-0.5 text-xs font-bold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Reason for Refund *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-sm"
              placeholder="e.g. Items spoiled, or customer cancelled order before dispatch"
            />
          </div>

          {/* Summary Box */}
          <div className="border border-zinc-150 dark:border-zinc-800 rounded-xl p-4 bg-emerald-50/20 dark:bg-emerald-950/5 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                Calculated Refund
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {isRazorpayOrder ? "Will hit secure Razorpay API" : "COD order (logs manual record)"}
              </span>
            </div>
            <div className="flex items-center text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-5 h-5" />
              <span>{totalRefundAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4.5 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5.5 py-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/10 flex items-center gap-1 disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Approve & Refund"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
