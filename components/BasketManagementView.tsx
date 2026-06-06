"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  collectionGroup,
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  writeBatch,
  where,
} from "firebase/firestore";
import { app } from "../firebaseConfig";
import { Order, DeliveryBoy } from "../types";
import {
  ShoppingBasket,
  Bike,
  User,
  MapPin,
  Weight,
  IndianRupee,
  Plus,
  Loader2,
  ChevronLeft,
  Package,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

const db = getFirestore(app);
const MAX_BASKET_WEIGHT = 10000;

interface SnapFallback { docs: Array<{ id: string; data: () => any; ref: any }>; size: number; }

interface BasketItemData {
  orderId: string;
  userId: string;
  customerName: string;
  address: string;
  totalAmount: number;
  weight: number;
}

interface BasketGroup {
  dboyId: string;
  dboyName: string;
  items: BasketItemData[];
  totalWeight: number;
  orderCount: number;
}

type Tab = "list" | "detail" | "create";

export default function BasketManagementView() {
  const [tab, setTab] = useState<Tab>("list");
  const [basketItems, setBasketItems] = useState<
    { dboyId: string; data: BasketItemData }[]
  >([]);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoyId, setSelectedBoyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createBoyId, setCreateBoyId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set()
  );
  const [submitting, setSubmitting] = useState(false);
  const [areaFilter, setAreaFilter] = useState("all");

  const safeQuery = async (queryFn: () => Promise<any>, fallback: SnapFallback): Promise<SnapFallback> => {
    try {
      const result = await queryFn();
      return result;
    } catch (err) {
      console.warn("Basket query failed (non-critical):", err);
      return fallback;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const emptySnap: SnapFallback = { docs: [], size: 0 };
      const [basketSnap, boySnap, ordersSnap] = await Promise.all([
        safeQuery(() => getDocs(query(collectionGroup(db, "basket"))), emptySnap),
        safeQuery(() => getDocs(query(collection(db, "deliveryBoys"))), emptySnap),
        safeQuery(
          () =>
            getDocs(
              query(
                collectionGroup(db, "orders"),
                where("status", "in", [
                  "Ready to Dispatch",
                  "Assigned",
                  "Accepted",
                  "Out for Delivery",
                  "Delivered",
                  "Completed",
                ])
              )
            ),
          emptySnap
        ),
      ]);

      const boyMap: Record<string, string> = {};
      const boys: DeliveryBoy[] = [];
      boySnap.docs.forEach((d) => {
        boyMap[d.id] = d.data().name || "Unknown";
        boys.push({ id: d.id, ...(d.data() as any) });
      });
      boys.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setDeliveryBoys(boys);

      const items: { dboyId: string; data: BasketItemData }[] = [];
      basketSnap.docs.forEach((d) => {
        const pathSegments = d.ref.path.split("/");
        const dboyId = pathSegments[1];
        items.push({
          dboyId,
          data: {
            orderId: d.data().orderId || d.id,
            userId: d.data().userId || "",
            customerName: d.data().name || "Unknown",
            address: d.data().address || "",
            totalAmount: Number(d.data().totalAmount || 0),
            weight: Number(d.data().weight || 0),
          },
        });
      });
      items.sort((a, b) => (a.data.customerName || "").localeCompare(b.data.customerName || ""));
      setBasketItems(items);

      const orders: Order[] = [];
      ordersSnap.docs.forEach((d) => {
        const userId = d.ref.parent.parent?.id || "N/A";
        const data = d.data();
        const addr = data.address || {
          name: "",
          phone: "",
          addressLine: "",
          pincode: "",
          city: "",
        };
        orders.push({
          id: d.id,
          userId,
          items: Array.isArray(data.items)
            ? data.items.map((i: any) => ({
                productId: i.productId || "",
                name: i.name || "Unknown",
                quantity: Number(i.quantity) || 0,
                price: Number(i.price) || 0,
                weight: Number(i.weight) || 0,
              }))
            : [],
          address: addr,
          status: data.status || "Pending",
          totalAmount: Number(data.totalAmount || 0),
          totalWeight: Number(data.totalWeight || 0),
          payment: {
            method: data.payment?.method || "cod",
            status: data.payment?.status || "pending",
          },
          areaCode: data.areaCode || "AREA_UNKNOWN",
          assignedDeliveryBoyId: data.assignedDeliveryBoyId,
          outOfCity: !!data.outOfCity,
          rejectionHistory: data.rejectionHistory || [],
          createdAt: data.createdAt || data.date || null,
        });
      });
      orders.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
      setAllOrders(orders);
    } catch (err) {
      console.error("Failed to load basket data", err);
      toast.error("Failed to load basket data");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupedBaskets = useMemo(() => {
    const groups: Record<string, BasketGroup> = {};
    basketItems.forEach((item) => {
      if (!groups[item.dboyId]) {
        const boy = deliveryBoys.find((b) => b.id === item.dboyId);
        groups[item.dboyId] = {
          dboyId: item.dboyId,
          dboyName: boy?.name || "Unknown Driver",
          items: [],
          totalWeight: 0,
          orderCount: 0,
        };
      }
      groups[item.dboyId].items.push(item.data);
      groups[item.dboyId].totalWeight += item.data.weight;
      groups[item.dboyId].orderCount += 1;
    });
    return Object.values(groups).sort((a, b) =>
      a.dboyName.localeCompare(b.dboyName)
    );
  }, [basketItems, deliveryBoys]);

  const getBasketStatus = (group: BasketGroup): string => {
    const orderIds = new Set(group.items.map((i) => i.orderId));
    let hasOutForDelivery = false;
    let hasAccepted = false;
    let hasAssigned = false;
    for (const order of allOrders) {
      if (order.id && orderIds.has(order.id)) {
        if (order.status === "Out for Delivery") hasOutForDelivery = true;
        else if (order.status === "Accepted") hasAccepted = true;
        else if (order.status === "Assigned") hasAssigned = true;
      }
    }
    if (hasOutForDelivery) return "Out for Delivery";
    if (hasAccepted) return "Accepted";
    return "Assigned";
  };

  const getBasketAreaCode = (group: BasketGroup): string => {
    const orderIds = new Set(group.items.map((i) => i.orderId));
    const areas = new Set<string>();
    for (const order of allOrders) {
      if (order.id && orderIds.has(order.id) && order.areaCode) {
        areas.add(order.areaCode);
      }
    }
    return areas.size > 0 ? Array.from(areas).join(", ") : "N/A";
  };

  const getBasketAssignedAt = (group: BasketGroup): Date | null => {
    const orderIds = new Set(group.items.map((i) => i.orderId));
    let earliest: Date | null = null;
    for (const order of allOrders) {
      if (order.id && orderIds.has(order.id) && order.createdAt) {
        const d =
          order.createdAt?.toDate?.() || new Date(order.createdAt);
        if (!earliest || d < earliest) earliest = d;
      }
    }
    return earliest;
  };

  const filteredBaskets = useMemo(() => {
    if (statusFilter === "all") return groupedBaskets;
    return groupedBaskets.filter((g) => getBasketStatus(g) === statusFilter);
  }, [groupedBaskets, statusFilter, allOrders]);

  const selectedBasket = useMemo(() => {
    if (!selectedBoyId) return null;
    return groupedBaskets.find((g) => g.dboyId === selectedBoyId) || null;
  }, [selectedBoyId, groupedBaskets]);

  const readyOrders = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.status === "Ready to Dispatch" &&
        !o.assignedDeliveryBoyId &&
        !o.outOfCity
    );
  }, [allOrders]);

  const ordersByArea = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    readyOrders.forEach((o) => {
      const area = o.areaCode || "AREA_UNKNOWN";
      if (!groups[area]) groups[area] = [];
      groups[area].push(o);
    });
    return groups;
  }, [readyOrders]);

  const areaCodes = useMemo(
    () => Object.keys(ordersByArea).sort(),
    [ordersByArea]
  );

  const filteredAreaOrders = useMemo(() => {
    if (!areaFilter || areaFilter === "all") return ordersByArea;
    const key = areaFilter;
    return { [key]: ordersByArea[key] || [] };
  }, [ordersByArea, areaFilter]);

  const selectedWeight = useMemo(() => {
    return readyOrders
      .filter((o) => o.id && selectedOrderIds.has(o.id))
      .reduce((sum, o) => sum + o.totalWeight, 0);
  }, [readyOrders, selectedOrderIds]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        const order = readyOrders.find((o) => o.id === orderId);
        if (order && selectedWeight + order.totalWeight > MAX_BASKET_WEIGHT) {
          toast.error(
            `Cannot add - exceeds 10kg limit (${(
              (selectedWeight + order.totalWeight) /
              1000
            ).toFixed(2)} kg)`
          );
          return prev;
        }
        next.add(orderId);
      }
      return next;
    });
  };

  const handleCreateBasket = async () => {
    if (!createBoyId) return toast.error("Please select a delivery boy");
    if (selectedOrderIds.size === 0)
      return toast.error("Please select at least one order");

    const boy = deliveryBoys.find((b) => b.id === createBoyId);
    if (!boy) return toast.error("Delivery boy not found");

    setSubmitting(true);
    const toastId = toast.loading("Creating basket...");

    try {
      const batch = writeBatch(db);
      const selectedOrders = readyOrders.filter(
        (o) => o.id && selectedOrderIds.has(o.id)
      );

      for (const order of selectedOrders) {
        if (!order.id || !order.userId) continue;

        const orderRef = doc(db, "users", order.userId, "orders", order.id);
        batch.update(orderRef, {
          status: "Assigned",
          assignedDeliveryBoyId: createBoyId,
        });

        const basketRef = doc(
          db,
          "deliveryBoys",
          createBoyId,
          "basket",
          order.id
        );
        batch.set(basketRef, {
          orderId: order.id,
          userId: order.userId,
          name: order.address?.name || "",
          address: order.address?.addressLine || "",
          totalAmount: order.totalAmount,
          weight: order.totalWeight,
        });
      }

      await batch.commit();
      toast.success(
        `Basket created with ${selectedOrders.length} orders for ${boy.name}`,
        { id: toastId }
      );
      setSelectedOrderIds(new Set());
      setCreateBoyId("");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create basket", { id: toastId });
    }
    setSubmitting(false);
  };

  // ---- RENDER ----

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Assigned: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-500/20",
      Accepted:
        "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-500/20",
      "Out for Delivery":
        "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-500/20",
      Completed:
        "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
          colors[status] ||
          "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
        }`}
      >
        {status}
      </span>
    );
  };

  const tabButton = (id: Tab, label: string, icon: any) => {
    const Icon = icon;
    const isActive = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
          isActive
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs"
            : "text-zinc-500 dark:text-zinc-400 border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`}
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 font-semibold text-sm">
          Loading delivery baskets...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            🧺 Basket Management
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            View, manage, and manually create delivery baskets for your fleet
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {tabButton("list", "All Baskets", ShoppingBasket)}
        {tabButton("create", "Manual Creation", Plus)}
        {tab === "detail" &&
          tabButton("detail", "Basket Detail", Package)}
      </div>

      {/* TAB: All Baskets */}
      {tab === "list" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-400">
              Filter by status:
            </span>
            {["all", "Assigned", "Accepted", "Out for Delivery"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                  statusFilter === s
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {filteredBaskets.length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
              <ShoppingBasket className="w-12 h-12 text-zinc-400 mb-3" />
              <span className="text-zinc-950 dark:text-white font-bold">
                No active baskets
              </span>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                Baskets appear here once orders are dispatched to delivery
                boys.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBaskets.map((group) => {
                const status = getBasketStatus(group);
                const areaCode = getBasketAreaCode(group);
                const assignedAt = getBasketAssignedAt(group);
                return (
                  <button
                    key={group.dboyId}
                    onClick={() => {
                      setSelectedBoyId(group.dboyId);
                      setTab("detail");
                    }}
                    className="text-left border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-4 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                          <Bike className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                            {group.dboyName}
                          </h3>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            {group.orderCount} order
                            {group.orderCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {statusBadge(status)}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-bold">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {areaCode}
                      </span>
                      <span className="flex items-center gap-1">
                        <Weight className="w-3 h-3" />
                        {(group.totalWeight / 1000).toFixed(2)} kg
                      </span>
                    </div>

                    {assignedAt && (
                      <p className="text-[10px] text-zinc-400 font-medium">
                        Assigned: {assignedAt.toLocaleDateString()}{" "}
                        {assignedAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Basket Detail */}
      {tab === "detail" && selectedBasket && (
        <div className="space-y-4">
          <button
            onClick={() => {
              setSelectedBoyId(null);
              setTab("list");
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-emerald-600 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to all baskets
          </button>

          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white">
                    {selectedBasket.dboyName}
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium">
                    {selectedBasket.orderCount} orders ·{" "}
                    {(selectedBasket.totalWeight / 1000).toFixed(2)} kg total
                  </p>
                </div>
              </div>
              {statusBadge(getBasketStatus(selectedBasket))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
              Orders in this basket
            </h3>
            {selectedBasket.items.map((item, idx) => (
              <div
                key={item.orderId}
                className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-400" />
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      {item.customerName}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <IndianRupee className="w-3 h-3" />
                    {item.totalAmount.toFixed(2)}
                  </span>
                </div>

                {item.address && (
                  <div className="flex items-start gap-1.5 text-xs text-zinc-500">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{item.address}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-bold">
                  <span className="flex items-center gap-1">
                    <Weight className="w-3 h-3" />
                    {(item.weight / 1000).toFixed(2)} kg
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-600">|</span>
                  <span className="font-mono text-zinc-500">
                    #{item.orderId.substring(0, 12)}...
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Total Basket Weight
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {(selectedBasket.totalWeight / 1000).toFixed(2)} kg
            </span>
          </div>
        </div>
      )}

      {tab === "detail" && !selectedBasket && (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
          <ShoppingBasket className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="text-zinc-950 dark:text-white font-bold">
            No basket selected
          </span>
          <button
            onClick={() => setTab("list")}
            className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
          >
            View all baskets
          </button>
        </div>
      )}

      {/* TAB: Manual Creation */}
      {tab === "create" && (
        <div className="space-y-6">
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-5 space-y-4">
            <h2 className="font-extrabold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <Bike className="w-4 h-4 text-blue-500" />
              Select Delivery Boy
            </h2>
            <select
              value={createBoyId}
              onChange={(e) => setCreateBoyId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Choose a delivery boy...</option>
              {deliveryBoys
                .filter((b) => b.active)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.phone})
                  </option>
                ))}
            </select>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                Ready to Dispatch Orders
              </h2>
              <div className="flex items-center gap-2">
                {areaCodes.length > 1 && (
                  <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[10px] font-bold focus:outline-none"
                  >
                    <option value="all">All Areas</option>
                    {areaCodes.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-zinc-500">
                Selected:{" "}
                <strong className="text-zinc-900 dark:text-white">
                  {selectedOrderIds.size}
                </strong>{" "}
                orders
              </span>
              <span
                className={`flex items-center gap-1 ${
                  selectedWeight > MAX_BASKET_WEIGHT
                    ? "text-rose-500"
                    : "text-zinc-500"
                }`}
              >
                <Weight className="w-3.5 h-3.5" />
                Weight:{" "}
                <strong
                  className={
                    selectedWeight > MAX_BASKET_WEIGHT
                      ? "text-rose-500"
                      : "text-zinc-900 dark:text-white"
                  }
                >
                  {(selectedWeight / 1000).toFixed(2)}
                </strong>{" "}
                / 10 kg
              </span>
            </div>

            {Object.entries(filteredAreaOrders).length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center">
                <Package className="w-10 h-10 text-zinc-400 mb-2" />
                <span className="text-xs text-zinc-400 font-bold">
                  No ready-to-dispatch orders available
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(filteredAreaOrders).map(
                  ([area, orders]) => (
                    <div key={area} className="space-y-2">
                      <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                          {area}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-bold">
                          ({orders.length} order
                          {orders.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {orders.map((order) => {
                          const isSelected =
                            !!order.id && selectedOrderIds.has(order.id);
                          const orderWeight = order.totalWeight || 0;
                          const wouldExceed =
                            !isSelected &&
                            selectedWeight + orderWeight > MAX_BASKET_WEIGHT;
                          return (
                            <button
                              key={order.id}
                              onClick={() =>
                                order.id && toggleOrderSelection(order.id)
                              }
                              disabled={wouldExceed && !isSelected}
                              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 ${
                                isSelected
                                  ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-700"
                                  : wouldExceed
                                  ? "border-zinc-100 dark:border-zinc-800 opacity-40 cursor-not-allowed"
                                  : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/50"
                              }`}
                            >
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                                    {order.address?.name || "Unknown"}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    #{order.id?.substring(0, 8)}...
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-500 truncate max-w-[250px]">
                                  {order.address?.addressLine || ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-bold text-zinc-400">
                                  {(orderWeight / 1000).toFixed(2)} kg
                                </span>
                                <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                                  ₹{order.totalAmount.toFixed(0)}
                                </span>
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    isSelected
                                      ? "bg-emerald-500 border-emerald-500"
                                      : "border-zinc-300 dark:border-zinc-600"
                                  }`}
                                >
                                  {isSelected && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <div className="flex-1 text-xs text-zinc-400 font-medium">
              {selectedOrderIds.size > 0 && (
                <span>
                  {selectedOrderIds.size} order
                  {selectedOrderIds.size !== 1 ? "s" : ""} selected ·{" "}
                  {(selectedWeight / 1000).toFixed(2)} kg / 10 kg
                </span>
              )}
            </div>
            {selectedOrderIds.size > 0 && (
              <button
                onClick={() => setSelectedOrderIds(new Set())}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-500 hover:text-rose-500 transition"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleCreateBasket}
              disabled={
                submitting || !createBoyId || selectedOrderIds.size === 0
              }
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {submitting ? "Creating..." : "Create Basket"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
