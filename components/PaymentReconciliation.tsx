"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, getFirestore, doc, updateDoc, Timestamp } from "firebase/firestore";
import { app, auth } from "../firebaseConfig";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Filter,
  Search,
  ArrowUpDown,
  Banknote,
  Smartphone,
  Split,
} from "lucide-react";
import toast from "react-hot-toast";
import { Order } from "@/types";

const db = getFirestore(app);

function toDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val);
  if (val?.seconds) return new Date(val.seconds * 1000);
  return null;
}

interface ReconciliationOrder {
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: Date | null;
  deliveredAt: Date | null;
  address: any;
  actualPayment?: {
    method: string;
    codAmount: number;
    upiAmount: number;
    totalCollected: number;
    collectedBy?: string;
  };
  reconciliation?: {
    expectedAmount: number;
    actualCollected: number;
    difference: number;
    status: string;
  };
  deliveryStatus?: {
    itemsDelivered: number;
    itemsTotal: number;
    partialDelivery: boolean;
  };
}

async function fetchAllDeliveredOrders(cachedOrders: any[] | undefined): Promise<ReconciliationOrder[]> {
  let allDocs: any[] = [];

  if (cachedOrders && cachedOrders.length > 0) {
    allDocs = cachedOrders.map((o: any) => ({ id: o.id, data: () => o }));
  } else {
    try {
      const cgSnap = await getDocs((await import("firebase/firestore")).collectionGroup(db, "orders"));
      allDocs = cgSnap.docs || [];
    } catch {}
    if (allDocs.length === 0) {
      try {
        const topSnap = await getDocs((await import("firebase/firestore")).collection(db, "orders"));
        allDocs = topSnap.docs || [];
      } catch {}
    }
  }

  return allDocs
    .map((d: any) => {
      const data = d.data();
      const status = data.status || "";
      if (status !== "Delivered" && status !== "delivered" && status !== "Completed" && status !== "completed") return null;
      return {
        id: d.id,
        userId: d.ref.parent.parent?.id || data.userId || "",
        totalAmount: Number(data.totalAmount) || 0,
        status,
        paymentMethod: data.payment?.method || data.paymentMethod || "",
        createdAt: toDate(data.createdAt),
        deliveredAt: toDate(data.deliveredAt),
        address: data.address,
        actualPayment: data.actualPayment,
        reconciliation: data.reconciliation,
        deliveryStatus: data.deliveryStatus,
      };
    })
    .filter(Boolean) as ReconciliationOrder[];
}

export default function PaymentReconciliation() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "settled" | "shortage" | "excess">("all");
  const [collectingOrder, setCollectingOrder] = useState<ReconciliationOrder | null>(null);
  const [collectMethod, setCollectMethod] = useState<"cod" | "razorpay" | "mixed">("cod");
  const [collectCodAmount, setCollectCodAmount] = useState("");
  const [collectUpiAmount, setCollectUpiAmount] = useState("");
  const [collectBy, setCollectBy] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["reconciliation"],
    queryFn: () => {
      const cachedOrders = queryClient.getQueryData<any[]>(["allOrders"]);
      return fetchAllDeliveredOrders(cachedOrders);
    },
    staleTime: 5 * 60 * 1000,
  });

  const settleMutation = useMutation({
    mutationFn: async ({ orderId, userId }: { orderId: string; userId: string }) => {
      const orderRef = doc(db, "users", userId, "orders", orderId);
      await updateDoc(orderRef, {
        reconciliation: {
          expectedAmount: orders.find((o) => o.id === orderId)?.totalAmount || 0,
          actualCollected: orders.find((o) => o.id === orderId)?.actualPayment?.totalCollected || 0,
          difference: 0,
          status: "settled",
          settledAt: Timestamp.now(),
          settledBy: auth.currentUser?.uid || "",
        },
      });
    },
    onSuccess: () => {
      toast.success("Order marked as settled!");
      queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
    },
    onError: () => toast.error("Failed to settle order."),
  });

  const collectMutation = useMutation({
    mutationFn: async ({
      orderId,
      userId,
      method,
      codAmount,
      upiAmount,
      collectedBy,
    }: {
      orderId: string;
      userId: string;
      method: string;
      codAmount: number;
      upiAmount: number;
      collectedBy: string;
    }) => {
      const totalCollected = codAmount + upiAmount;
      const orderRef = doc(db, "users", userId, "orders", orderId);
      const order = orders.find((o) => o.id === orderId);
      const expected = order?.totalAmount || 0;
      const diff = totalCollected - expected;

      await updateDoc(orderRef, {
        actualPayment: {
          method,
          codAmount,
          upiAmount,
          totalCollected,
          collectedBy,
          collectedAt: Timestamp.now(),
        },
        reconciliation: {
          expectedAmount: expected,
          actualCollected: totalCollected,
          difference: diff,
          status: diff === 0 ? "settled" : diff < 0 ? "shortage" : "excess",
          settledAt: diff === 0 ? Timestamp.now() : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Payment recorded!");
      setCollectingOrder(null);
      setCollectCodAmount("");
      setCollectUpiAmount("");
      setCollectBy("");
      queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
    },
    onError: () => toast.error("Failed to record payment."),
  });

  const filtered = useMemo(() => {
    let result = orders;
    if (filterStatus !== "all") {
      result = result.filter((o) => {
        const recStatus = o.reconciliation?.status || "pending";
        return recStatus === filterStatus;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.address?.name || "").toLowerCase().includes(q) ||
          (o.address?.phone || "").includes(q)
      );
    }
    return result;
  }, [orders, filterStatus, search]);

  const stats = useMemo(() => {
    const total = orders.length;
    const settled = orders.filter((o) => o.reconciliation?.status === "settled").length;
    const pending = orders.filter((o) => !o.reconciliation || o.reconciliation.status === "pending").length;
    const shortage = orders.filter((o) => o.reconciliation?.status === "shortage").length;
    const excess = orders.filter((o) => o.reconciliation?.status === "excess").length;
    const totalExpected = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalCollected = orders.reduce((s, o) => s + (o.actualPayment?.totalCollected || 0), 0);
    return { total, settled, pending, shortage, excess, totalExpected, totalCollected };
  }, [orders]);

  const getStatusBadge = (order: ReconciliationOrder) => {
    if (!order.reconciliation) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-300/10">
          No Payment Data
        </span>
      );
    }
    const s = order.reconciliation.status;
    if (s === "settled")
      return (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10">
          Settled
        </span>
      );
    if (s === "shortage")
      return (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-500/10">
          Shortage
        </span>
      );
    if (s === "excess")
      return (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-500/10">
          Excess
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-100 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border border-sky-500/10">
        Pending
      </span>
    );
  };

  const getPaymentIcon = (method: string) => {
    if (method === "cod") return <Banknote className="w-3 h-3 text-emerald-500" />;
    if (method === "razorpay") return <Smartphone className="w-3 h-3 text-sky-500" />;
    if (method === "mixed") return <Split className="w-3 h-3 text-purple-500" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 font-semibold text-sm">Loading delivered orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 md:p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
        <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
          Payment Reconciliation
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">
          Track expected vs collected payment for delivered orders. Record COD/UPI collections and settle discrepancies.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Delivered", value: stats.total, color: "text-zinc-900 dark:text-white" },
          { label: "Settled", value: stats.settled, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pending", value: stats.pending, color: "text-sky-600 dark:text-sky-400" },
          { label: "Shortage / Excess", value: `${stats.shortage} / ${stats.excess}`, color: "text-amber-600 dark:text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-3 text-center">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Expected Revenue</p>
            <p className="text-lg font-black text-zinc-900 dark:text-white">₹{stats.totalExpected.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Actually Collected</p>
            <p className="text-lg font-black text-zinc-900 dark:text-white">₹{stats.totalCollected.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-2.5 items-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by order ID, customer name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "pending", "settled", "shortage", "excess"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition border shadow-sm ${
                filterStatus === s
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
          <AlertTriangle className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="text-zinc-950 dark:text-white font-bold">No delivered orders found</span>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
            Delivered orders will appear here for payment reconciliation.
          </p>
        </div>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[800px]">
              <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-bold">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Expected</th>
                  <th className="p-3">Collected</th>
                  <th className="p-3">Difference</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-855 font-semibold text-zinc-700 dark:text-zinc-300">
                {filtered.map((order) => {
                  const expected = order.totalAmount;
                  const collected = order.actualPayment?.totalCollected || 0;
                  const diff = collected - expected;

                  return (
                    <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="p-3">
                        <span className="font-bold text-zinc-900 dark:text-white">{order.id.substring(0, 16)}...</span>
                        <br />
                        <span className="text-[9px] text-zinc-400">
                          {order.createdAt?.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) || "-"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold">{order.address?.name || "Unknown"}</span>
                        <br />
                        <span className="text-[9px] text-zinc-400">{order.address?.phone || ""}</span>
                      </td>
                      <td className="p-3 font-extrabold text-zinc-900 dark:text-white">₹{expected.toLocaleString("en-IN")}</td>
                      <td className="p-3">
                        <span className="font-extrabold text-zinc-900 dark:text-white">₹{collected.toLocaleString("en-IN")}</span>
                        {order.actualPayment && (
                          <span className="ml-1 inline-flex items-center gap-0.5">
                            {getPaymentIcon(order.actualPayment.method)}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {order.reconciliation ? (
                          <span
                            className={`font-extrabold ${
                              diff === 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : diff < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {diff === 0 ? "₹0" : diff > 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-[10px] font-bold text-zinc-400 uppercase">
                        {order.paymentMethod || "—"}
                      </td>
                      <td className="p-3">{getStatusBadge(order)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!order.actualPayment && (
                            <button
                              onClick={() => setCollectingOrder(order)}
                              className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-bold text-[10px] transition shadow-sm hover:shadow-md"
                            >
                              Collect
                            </button>
                          )}
                          {order.reconciliation && order.reconciliation.status !== "settled" && (
                            <button
                              onClick={() => {
                                if (confirm("Mark this order as settled?")) {
                                  settleMutation.mutate({ orderId: order.id, userId: order.userId });
                                }
                              }}
                              disabled={settleMutation.isPending}
                              className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 rounded-lg text-[10px] font-bold hover:text-emerald-500 hover:bg-emerald-500/5 transition shadow-sm"
                            >
                              <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
                              Settle
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {collectingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">Record Payment</h2>
              <button onClick={() => setCollectingOrder(null)} className="text-zinc-400 hover:text-zinc-600">
                ✕
              </button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold text-zinc-500">Order: {collectingOrder.id.substring(0, 20)}...</p>
              <p className="text-xs font-bold text-zinc-500">Customer: {collectingOrder.address?.name || "Unknown"}</p>
              <p className="text-sm font-black text-zinc-900 dark:text-white">Expected: ₹{collectingOrder.totalAmount.toLocaleString("en-IN")}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Payment Method</label>
                <div className="flex gap-2 mt-1">
                  {(["cod", "razorpay", "mixed"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setCollectMethod(m)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        collectMethod === m
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                          : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {m === "cod" && <Banknote className="w-3 h-3" />}
                      {m === "razorpay" && <Smartphone className="w-3 h-3" />}
                      {m === "mixed" && <Split className="w-3 h-3" />}
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {(collectMethod === "cod" || collectMethod === "mixed") && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">COD Amount (₹)</label>
                  <input
                    type="number"
                    value={collectCodAmount}
                    onChange={(e) => setCollectCodAmount(e.target.value)}
                    placeholder="0"
                    className="w-full mt-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                  />
                </div>
              )}

              {(collectMethod === "razorpay" || collectMethod === "mixed") && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">UPI / Razorpay Amount (₹)</label>
                  <input
                    type="number"
                    value={collectUpiAmount}
                    onChange={(e) => setCollectUpiAmount(e.target.value)}
                    placeholder="0"
                    className="w-full mt-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Collected By (optional)</label>
                <input
                  type="text"
                  value={collectBy}
                  onChange={(e) => setCollectBy(e.target.value)}
                  placeholder="Driver / Staff name"
                  className="w-full mt-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                />
              </div>

              {/* Preview */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Summary</p>
                <div className="flex justify-between mt-1 text-xs font-bold">
                  <span className="text-zinc-500">Total Collected:</span>
                  <span className="text-zinc-900 dark:text-white">
                    ₹{(Number(collectCodAmount) || 0) + (Number(collectUpiAmount) || 0)}
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-xs font-bold">
                  <span className="text-zinc-500">Expected:</span>
                  <span className="text-zinc-900 dark:text-white">₹{collectingOrder.totalAmount}</span>
                </div>
                <div className="flex justify-between mt-1 text-xs font-black">
                  <span className="text-zinc-500">Difference:</span>
                  <span
                    className={
                      (Number(collectCodAmount) || 0) + (Number(collectUpiAmount) || 0) - collectingOrder.totalAmount === 0
                        ? "text-emerald-600"
                        : (Number(collectCodAmount) || 0) + (Number(collectUpiAmount) || 0) < collectingOrder.totalAmount
                        ? "text-rose-600"
                        : "text-amber-600"
                    }
                  >
                    {(() => {
                      const d = (Number(collectCodAmount) || 0) + (Number(collectUpiAmount) || 0) - collectingOrder.totalAmount;
                      return d === 0 ? "₹0 (Settled)" : d > 0 ? `+₹${d} (Excess)` : `-₹${Math.abs(d)} (Shortage)`;
                    })()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCollectingOrder(null)}
                className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const cod = Number(collectCodAmount) || 0;
                  const upi = Number(collectUpiAmount) || 0;
                  if (cod + upi === 0) return toast.error("Enter at least one amount.");
                  collectMutation.mutate({
                    orderId: collectingOrder.id,
                    userId: collectingOrder.userId,
                    method: collectMethod,
                    codAmount: cod,
                    upiAmount: upi,
                    collectedBy: collectBy,
                  });
                }}
                disabled={collectMutation.isPending}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                {collectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
