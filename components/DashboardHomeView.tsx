"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs, collectionGroup, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebaseConfig";
const db = getFirestore(app);
import StorePreview from "./StorePreview";
import {
  ShoppingBag, Package, Users, Bike, AlertTriangle, Ticket, MessageSquare,
  IndianRupee, TrendingUp, Loader2,
  ChevronDown, ChevronUp, ExternalLink, MapPin, Phone, Percent, ArrowUpRight,
} from "lucide-react";

interface KpiCard {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bgColor: string;
  view?: string;
}

export default function DashboardHomeView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [showPendingOrders, setShowPendingOrders] = useState(false);
  const auth = getAuth(app);
  const uid = auth.currentUser?.uid;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboardHome", uid],
    queryFn: async () => {
      const safeQuery = async (fn: () => Promise<any>, fallback: any) => {
        try { return await fn(); }
        catch { return fallback; }
      };
      const emptySnap = { docs: [], size: 0 };

      const [allOrdersSnap, productsSnap, workersSnap, boysSnap, ticketsSnap, contactsSnap, couponsSnap] = await Promise.all([
        safeQuery(() => getDocs(collectionGroup(db, "orders")), emptySnap),
        safeQuery(() => getDocs(query(collection(db, "products"), where("active", "==", true))), emptySnap),
        safeQuery(() => getDocs(query(collection(db, "workers"), where("active", "==", true))), emptySnap),
        safeQuery(() => getDocs(query(collection(db, "deliveryBoys"), where("active", "==", true))), emptySnap),
        safeQuery(() => getDocs(query(collection(db, "tickets"), where("resolved", "==", false))), emptySnap),
        safeQuery(() => getDocs(collection(db, "contacts")), emptySnap),
        safeQuery(() => getDocs(collection(db, "coupons")), emptySnap),
      ]);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const toDate = (val: any): Date | null => {
        if (!val) return null;
        if (val?.toDate) return val.toDate();
        if (val?.seconds) return new Date(val.seconds * 1000);
        if (val instanceof Date) return val;
        return null;
      };

      const orders = allOrdersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const activeStatuses = ["Pending", "Packing", "Ready to Dispatch", "Assigned", "Accepted", "Out for Delivery", "Awaiting Verification"];
      const pendingOrders = orders.filter((o: any) => activeStatuses.includes(o.status));
      const deliveredOrders = orders.filter((o: any) => o.status === "Delivered" || o.status === "Completed");
      const todayDelivered = deliveredOrders.filter((o: any) => {
        const dt = toDate(o.deliveredAt || o.createdAt || o.date);
        return dt && dt >= todayStart;
      });
      const todayRevenue = todayDelivered.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

      const lowStock = productsSnap.docs.filter((d: any) => {
        const stock = d.data().stock ?? 0;
        return stock < (d.data().lowStockThreshold ?? 5);
      });
      const activeCoupons = couponsSnap.docs.filter((d: any) => d.data().active === true);
      const unreadContacts = contactsSnap.docs.filter((d: any) => d.data().read !== true);

      return { orders, pendingOrders, deliveredOrders, todayDelivered, todayRevenue, lowStock, activeCoupons, unreadContacts, productsSnap, workersSnap, boysSnap, ticketsSnap };
    },
    refetchInterval: 30000,
    staleTime: 10000,
    enabled: !!uid,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const kpis: KpiCard[] = data ? [
    { label: "Pending Orders", value: data.pendingOrders.length, icon: Package, color: "text-amber-600", bgColor: "bg-amber-50", view: "pending-expand" },
    { label: "Today's Revenue", value: `₹${data.todayRevenue.toFixed(0)}`, icon: IndianRupee, color: "text-emerald-600", bgColor: "bg-emerald-50", view: "earnings" },
    { label: "Low Stock Items", value: data.lowStock.length, icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50", view: "products" },
    { label: "Active Workers", value: data.workersSnap.size, icon: Users, color: "text-orange-600", bgColor: "bg-orange-50", view: "workers" },
    { label: "Active Delivery Boys", value: data.boysSnap.size, icon: Bike, color: "text-blue-600", bgColor: "bg-blue-50", view: "deliveryBoys" },
    { label: "Active Coupons", value: data.activeCoupons.length, icon: Percent, color: "text-pink-600", bgColor: "bg-pink-50", view: "coupons" },
    { label: "Unresolved Tickets", value: data.ticketsSnap.size, icon: Ticket, color: "text-purple-600", bgColor: "bg-purple-50", view: "tickets" },
    { label: "Unread Messages", value: data.unreadContacts.length, icon: MessageSquare, color: "text-pink-600", bgColor: "bg-pink-50", view: "contacts" },
    { label: "Total Products", value: data.productsSnap.size, icon: ShoppingBag, color: "text-teal-600", bgColor: "bg-teal-50", view: "products" },
  ] : [];

  const handleKpiClick = (view?: string) => {
    if (!view) return;
    if (view === "pending-expand") { setShowPendingOrders(!showPendingOrders); }
    else { onNavigate?.(view); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Dashboard Home</h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">At-a-glance overview of your store performance</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <button
            key={i}
            onClick={() => handleKpiClick(kpi.view)}
            className={`rounded-2xl ${kpi.bgColor} p-5 border border-zinc-200/60 shadow-sm text-left transition hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${kpi.view ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between">
              <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
              <ArrowUpRight className={`w-4 h-4 ${kpi.color} opacity-50`} />
            </div>
            <p className="mt-4 text-2xl font-black text-zinc-800">{kpi.value}</p>
            <p className="mt-1 text-xs font-semibold text-zinc-500">{kpi.label}</p>
          </button>
        ))}
      </div>

      {showPendingOrders && data && (
        <div className="rounded-2xl bg-white border border-zinc-200/60 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="font-bold text-zinc-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              Pending / Uncompleted Orders ({data.pendingOrders.length})
            </h2>
            <button onClick={() => onNavigate?.("orders")} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-zinc-100 max-h-[400px] overflow-y-auto">
            {data.pendingOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm font-medium">No pending orders</div>
            ) : (
              data.pendingOrders.map((order: any) => (
                <button key={order.id} onClick={() => onNavigate?.("orders")} className="w-full text-left flex items-center gap-4 p-4 hover:bg-zinc-50 transition group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 truncate">{order.address?.name || "Unknown"}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${order.status === "Pending" ? "bg-amber-100 text-amber-700" : order.status === "Packing" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.address?.addressLine || "—"}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {order.address?.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 mt-0.5">
                      <span>#{order.id?.slice(-8).toUpperCase()}</span>
                      <span>₹{order.totalAmount?.toFixed(0)}</span>
                      <span>{order.items?.length || 0} items</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500 transition shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <StorePreview />

      <div className="rounded-2xl bg-white border border-zinc-200/60 p-6 shadow-sm">
        <h2 className="font-bold text-zinc-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" /> Quick Actions
        </h2>
        <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
          {[
            { label: "Add Product", view: "products" },
            { label: "View Orders", view: "orders" },
            { label: "Dispatch Baskets", view: "dispatchBaskets" },
            { label: "Manage Workers", view: "workers" },
          ].map((action) => (
            <button key={action.view} onClick={() => onNavigate?.(action.view)}
              className="rounded-xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:text-emerald-700 transition-all text-left">
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}