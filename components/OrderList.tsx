// components/OrderList.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Order, OrderStatus } from "../types";
import {
  Package,
  Clock,
  MapPin,
  Phone,
  Weight,
  CreditCard,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Volume2,
  VolumeX,
  IndianRupee,
  RotateCcw,
  Bike,
  Truck,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface OrderListProps {
  orders: Order[];
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onUpdateStatus: (userId: string, orderId: string, status: OrderStatus, extra?: any) => Promise<any>;
  onOpenRefund: (order: Order) => void;
  onOpenDispatch: (order: Order) => void;
  onOpenDeliveryPartner: (order: Order) => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
}

export default function OrderList({
  orders,
  isLoading,
  isRefetching,
  onRefresh,
  onUpdateStatus,
  onOpenRefund,
  onOpenDispatch,
  onOpenDeliveryPartner,
  autoRefresh,
  onToggleAutoRefresh,
}: OrderListProps) {
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());
  const seenOrderIdsRef = useRef<Set<string>>(new Set());

  // 1. Initialize seenOrderIds from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("seenOrderIds");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Trim to last 500 items to prevent unbounded growth (Bug 9)
          const trimmed = parsed.slice(-500);
          seenOrderIdsRef.current = new Set(trimmed);
          // Update localStorage with trimmed version
          localStorage.setItem("seenOrderIds", JSON.stringify(trimmed));
          console.log(`[OrderList] Trimmed seenOrderIds from ${parsed.length} to ${trimmed.length}`);
        } catch (e) {
          console.error("Failed to parse seenOrderIds:", e);
        }
      }
    }
  }, []);

  // 2. Synthesize Bell Chime using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      // Create audio context
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      // Gentle chord notes (C6 pitch -> G6 pitch)
      oscillator.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.15); // C6

      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.8);
      console.log("[Audio] Played synthesized incoming order bell chime.");
    } catch (err) {
      console.warn("[Audio] real-time chime failed, browser likely blocking sound:", err);
    }
  };

  // 3. Compare incoming orders and trigger highlighting + chime
  useEffect(() => {
    if (orders.length === 0 || seenOrderIdsRef.current.size === 0) {
      // First load or empty, just populate seen IDs silently
      orders.forEach((o) => {
        if (o.id) seenOrderIdsRef.current.add(o.id);
      });
      localStorage.setItem("seenOrderIds", JSON.stringify(Array.from(seenOrderIdsRef.current)));
      return;
    }

    const currentSeen = new Set(seenOrderIdsRef.current);
    const newArrivalsList: string[] = [];

    orders.forEach((o) => {
      if (o.id && !currentSeen.has(o.id)) {
        newArrivalsList.push(o.id);
        seenOrderIdsRef.current.add(o.id);
      }
    });

    if (newArrivalsList.length > 0) {
      // Update localStorage
      localStorage.setItem("seenOrderIds", JSON.stringify(Array.from(seenOrderIdsRef.current)));

      // Add to React highlight list
      setNewlyArrivedIds((prev) => {
        const next = new Set(prev);
        newArrivalsList.forEach((id) => next.add(id));
        return next;
      });

      // Play soft alert chime
      playChime();
      toast.success(`🔔 Recieved ${newArrivalsList.length} new order(s)!`, { icon: "📦" });

      // Automatically fade out after 10 seconds
      setTimeout(() => {
        setNewlyArrivedIds((prev) => {
          const next = new Set(prev);
          newArrivalsList.forEach((id) => next.delete(id));
          return next;
        });
      }, 10000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20";
      case "Out for Delivery":
        return "bg-sky-100 dark:bg-sky-950/30 text-sky-800 dark:text-sky-400 border border-sky-500/20";
      case "Ready to Dispatch":
        return "bg-indigo-100 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-400 border border-indigo-500/20";
      case "Packing":
        return "bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border border-amber-500/20";
      case "Assigned":
        return "bg-violet-100 dark:bg-violet-950/30 text-violet-800 dark:text-violet-400 border border-violet-500/20";
      case "Cancelled":
        return "bg-rose-100 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 border border-rose-500/20";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-400 border border-zinc-500/10";
    }
  };

  const formatWeight = (grams: number) => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${grams} g`;
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 p-4 rounded-2xl backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Active Orders</h2>
          <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
            {orders.length} uncompleted
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition ${
              soundEnabled
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-400"
            }`}
            title={soundEnabled ? "Mute order chime" : "Unmute order chime"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Auto Refresh Toggle */}
          <button
            onClick={onToggleAutoRefresh}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
              autoRefresh
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
            <span>Auto Sync {autoRefresh ? "(30s)" : "Off"}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Orders Grid/List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-zinc-500 font-semibold text-sm">Hydrating active order log...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-16 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/20">
          <Package className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="text-zinc-900 dark:text-white font-bold">No active orders found</span>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Excellent! All current orders are processed, delivered, or cancelled.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const orderId = order.id || "";
            const isExpanded = !!expandedOrders[orderId];
            const isNew = newlyArrivedIds.has(orderId);

            return (
              <div
                key={orderId}
                className={`border rounded-2xl bg-white dark:bg-zinc-900 transition-all duration-300 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-800
                ${
                  isNew
                    ? "border-amber-400 dark:border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/5 animate-pulse"
                    : "border-zinc-200 dark:border-zinc-800/80"
                }`}
              >
                {/* Collapsed Header Summary */}
                <div
                  onClick={() => toggleExpand(orderId)}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-zinc-900 dark:text-white text-sm">
                          {order.address?.name || order.id}
                        </span>
                        {isNew && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[9px] uppercase tracking-wider animate-bounce">
                            NEW
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString() : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 flex-wrap">
                    {/* Amount */}
                    <div className="flex items-center text-zinc-900 dark:text-white font-extrabold text-sm">
                      <IndianRupee className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{order.totalAmount.toFixed(2)}</span>
                    </div>

                    {/* Weight */}
                    <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-0.5 rounded-md">
                      <Weight className="w-3 h-3" />
                      <span>{formatWeight(order.totalWeight)}</span>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusStyle(order.status)}`}>
                      {order.status}
                    </span>

                    {/* Ticket Badge */}
                    {(order as any).ticketContactId && (
                      <a
                        href={`/dashboard?view=contacts`}
                        className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-200 transition"
                        title="This order has a support ticket"
                      >
                        Ticket
                      </a>
                    )}

                    {/* Expand Indicator */}
                    <div className="text-zinc-400 hover:text-zinc-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4 text-sm transition-all duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Customer info */}
                      <div className="space-y-2 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/10">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                          Delivery Logistics
                        </h4>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 font-semibold leading-relaxed">
                              {order.address?.addressLine || order.address?.city || ""}
                            </p>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.2 rounded mt-1.5 inline-block">
                              {order.areaCode || "No Area Pincode"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 text-xs font-semibold text-zinc-500">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{order.address?.phone || ""}</span>
                        </div>
                      </div>

                      {/* Payment info */}
                      <div className="space-y-2 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/10 flex flex-col justify-between">
                        <div>
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                            Transaction & Payment
                          </h4>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-zinc-400" />
                            <span className={`text-xs font-bold uppercase ${
                              order.payment?.method === "razorpay" ? "text-purple-600 dark:text-purple-400" : "text-sky-600 dark:text-sky-400"
                            }`}>
                              {order.payment?.method?.toUpperCase() || "N/A"}
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                              order.payment?.status === "paid"
                                ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10"
                                : "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-500/10"
                            }`}>
                              {order.payment?.status === "paid" ? "PAID" : "UNPAID"}
                            </span>
                          </div>
                        </div>

                        {order.assignedDeliveryBoyId && (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 mt-2">
                            <Bike className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Assigned: <strong>{order.assignedDeliveryBoyId.substring(0, 8)}...</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items Table */}
                    <div>
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                        Purchased Groceries ({order.items.length})
                      </h4>
                      <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-zinc-50 dark:bg-zinc-800 font-bold text-zinc-500 border-b border-zinc-100 dark:border-zinc-850">
                            <tr>
                              <th className="p-2.5">Item Name</th>
                              <th className="p-2.5 text-center">Qty</th>
                              <th className="p-2.5 text-right">Price</th>
                              <th className="p-2.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 font-semibold text-zinc-700 dark:text-zinc-300">
                            {order.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                                <td className="p-2.5">
                                  <div>
                                    <p className="font-bold">{item.name}</p>
                                    <p className="text-[9px] text-zinc-400 font-medium">
                                      Unit weight: {formatWeight(item.weight)}
                                    </p>
                                  </div>
                                </td>
                                <td className="p-2.5 text-center font-bold text-zinc-900 dark:text-white">
                                  {item.quantity}
                                </td>
                                <td className="p-2.5 text-right">₹{item.price.toFixed(2)}</td>
                                <td className="p-2.5 text-right font-extrabold text-zinc-950 dark:text-white">
                                  ₹{(item.quantity * item.price).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div>
                        {/* Refund trigger for PAID Razorpay orders */}
                        {order.payment?.method === "razorpay" && (
                          <button
                            type="button"
                            onClick={() => onOpenRefund(order)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 bg-rose-500/5 rounded-xl hover:bg-rose-500/10 text-xs font-bold transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Issue Refund</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {order.status === "Pending" && (
                          <>
                            <button
                              onClick={() => {
                                if (confirm("Cancel this order?")) {
                                  onUpdateStatus(order.userId, orderId, "Cancelled");
                                }
                              }}
                              className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                            >
                              Cancel Order
                            </button>
                            <button
                              onClick={() => onUpdateStatus(order.userId, orderId, "Packing")}
                              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
                            >
                              Process Order
                            </button>
                          </>
                        )}

                        {order.status === "Packing" && (
                          <button
                            onClick={() => onUpdateStatus(order.userId, orderId, "Ready to Dispatch")}
                            className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/5"
                          >
                            Mark Ready to Dispatch
                          </button>
                        )}

                        {order.status === "Ready to Dispatch" && (
                          <>
                            {/* Local Assign Basket triggers selection */}
                            <button
                              onClick={() => onOpenDispatch(order)}
                              className="flex items-center gap-1 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                            >
                              <Bike className="w-3.5 h-3.5" />
                              <span>Local Dispatch</span>
                            </button>

                            {/* Third Party Trigger */}
                            <button
                              onClick={() => onOpenDeliveryPartner(order)}
                              className="flex items-center gap-1 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Out-of-City Shipping</span>
                            </button>
                          </>
                        )}

                        {order.status === "Assigned" && (
                          <button
                            onClick={() => onUpdateStatus(order.userId, orderId, "Out for Delivery")}
                            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition"
                          >
                            Mark Out for Delivery
                          </button>
                        )}

                        {order.status === "Out for Delivery" && (
                          <button
                            onClick={() => {
                              // Mark delivered and also clear from driver basket
                              onUpdateStatus(order.userId, orderId, "Delivered", { isPaid: true });
                            }}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
