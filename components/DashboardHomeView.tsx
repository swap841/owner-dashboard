"use client";

import { useEffect, useState } from "react";
import { collection, collectionGroup, query, where, getDocs } from "firebase/firestore";
import { app } from "../firebaseConfig";
import { getFirestore } from "firebase/firestore";

const db = getFirestore(app);
import {
  ShoppingBag, Package, Users, Bike, AlertTriangle, Ticket, MessageSquare,
  IndianRupee, TrendingUp, Clock, ArrowUpRight, Loader2, Percent,
} from "lucide-react";

interface KpiCard {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bgColor: string;
}

export default function DashboardHomeView() {
  const [kpis, setKpis] = useState<KpiCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [ordersSnap, todayOrdersSnap, productsSnap, workersSnap, boysSnap, ticketsSnap, contactsSnap, couponsSnap] = await Promise.all([
          getDocs(query(collectionGroup(db, "orders"), where("status", "in", ["Pending", "Packing", "Ready to Dispatch"]))),
          getDocs(query(collectionGroup(db, "orders"), where("createdAt", ">=", todayStart.toISOString()))),
          getDocs(collection(db, "products")),
          getDocs(query(collection(db, "workers"), where("active", "==", true))),
          getDocs(query(collection(db, "deliveryBoys"), where("active", "==", true))),
          getDocs(query(collection(db, "tickets"), where("resolved", "==", false))),
          getDocs(query(collection(db, "contacts"), where("read", "==", false))),
          getDocs(collection(db, "coupons")),
        ]);

        const lowStock = productsSnap.docs.filter(d => {
          const stock = d.data().stock ?? 0;
          const threshold = d.data().lowStockThreshold ?? 5;
          return stock < threshold;
        });

        const todayRevenue = todayOrdersSnap.docs.reduce((sum, d) => sum + (d.data().totalAmount || 0), 0);
        const activeCoupons = couponsSnap.docs.filter(d => d.data().active === true);

        setKpis([
          { label: "Pending Orders", value: ordersSnap.size, icon: Package, color: "text-amber-600", bgColor: "bg-amber-50" },
          { label: "Today's Revenue", value: `₹${todayRevenue.toFixed(0)}`, icon: IndianRupee, color: "text-emerald-600", bgColor: "bg-emerald-50" },
          { label: "Low Stock Items", value: lowStock.length, icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50" },
          { label: "Active Workers", value: workersSnap.size, icon: Users, color: "text-orange-600", bgColor: "bg-orange-50" },
          { label: "Active Delivery Boys", value: boysSnap.size, icon: Bike, color: "text-blue-600", bgColor: "bg-blue-50" },
          { label: "Active Coupons", value: activeCoupons.length, icon: Percent, color: "text-pink-600", bgColor: "bg-pink-50" },
          { label: "Unresolved Tickets", value: ticketsSnap.size, icon: Ticket, color: "text-purple-600", bgColor: "bg-purple-50" },
          { label: "Unread Messages", value: contactsSnap.size, icon: MessageSquare, color: "text-pink-600", bgColor: "bg-pink-50" },
          { label: "Total Products", value: productsSnap.size, icon: ShoppingBag, color: "text-teal-600", bgColor: "bg-teal-50" },
        ]);
      } catch (err) {
        console.error("Failed to load KPIs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKpis();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          Dashboard Home
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">
          At-a-glance overview of your store performance
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`rounded-2xl ${kpi.bgColor} p-5 border border-zinc-200/60 shadow-sm`}>
            <div className="flex items-center justify-between">
              <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
              <ArrowUpRight className={`w-4 h-4 ${kpi.color} opacity-50`} />
            </div>
            <p className="mt-4 text-2xl font-black text-zinc-800">{kpi.value}</p>
            <p className="mt-1 text-xs font-semibold text-zinc-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-zinc-200/60 p-6 shadow-sm">
        <h2 className="font-bold text-zinc-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Quick Actions
        </h2>
        <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
          {[
            { label: "Add Product", view: "products" as const },
            { label: "View Orders", view: "orders" as const },
            { label: "Dispatch Baskets", view: "dispatchBaskets" as const },
            { label: "Manage Workers", view: "workers" as const },
          ].map((action) => (
            <button
              key={action.view}
              onClick={() => window.location.hash = action.view}
              className="rounded-xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:text-emerald-700 transition-all text-left"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
