// components/CustomerAnalytics.tsx

"use client";

import { useMemo } from "react";
import {
  Users, TrendingUp, Repeat, IndianRupee, MapPin,
  ShoppingBag, Calendar,
} from "lucide-react";
import { Order } from "@/types";

function StatCard({ label, value, icon: Icon, color, bgColor, subtitle }: {
  label: string; value: string | number; icon: any; color: string; bgColor: string; subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-between shadow-xs">
      <div className="space-y-1">
        <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">{label}</span>
        <h3 className="text-2xl font-black text-zinc-950 dark:text-white">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</h3>
        {subtitle && <p className="text-xs text-zinc-400 font-medium">{subtitle}</p>}
      </div>
      <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

export default function CustomerAnalytics({ allOrders }: { allOrders: Order[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const tsGt = (ts: any, date: Date) => {
      if (!ts) return false;
      const d = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : null;
      return d && d >= date;
    };
    const tsLte = (ts: any, date: Date) => {
      if (!ts) return false;
      const d = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : null;
      return d && d <= date;
    };

    const delivered = allOrders.filter((o) => o.status === "Delivered");
    const cancelled = allOrders.filter((o) => o.status === "Cancelled");

    const userIds = [...new Set(allOrders.map((o) => o.userId))];
    const deliveredUserIds = [...new Set(delivered.map((o) => o.userId))];
    const monthlyOrders = allOrders.filter((o) => tsGt(o.createdAt, monthStart) && tsLte(o.createdAt, monthEnd));
    const monthlyNewUsers = [...new Set(monthlyOrders.map((o) => o.userId))].filter(
      (uid) => !allOrders.some((o) => o.userId === uid && tsLte(o.createdAt, monthStart))
    );

    const repeatBuyers = userIds.filter((uid) => allOrders.filter((o) => o.userId === uid).length >= 2);

    const deliveredTotal = delivered.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const cancelledTotal = cancelled.reduce((s, o) => s + (o.totalAmount || 0), 0);

    const areaMap: Record<string, { count: number; revenue: number }> = {};
    delivered.forEach((o) => {
      const area = o.areaCode || "Unknown";
      if (!areaMap[area]) areaMap[area] = { count: 0, revenue: 0 };
      areaMap[area].count++;
      areaMap[area].revenue += o.totalAmount || 0;
    });
    const topAreas = Object.entries(areaMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);

    const spendPerUser: Record<string, number> = {};
    delivered.forEach((o) => {
      spendPerUser[o.userId] = (spendPerUser[o.userId] || 0) + (o.totalAmount || 0);
    });
    const topCustomers = Object.entries(spendPerUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, total]) => ({ userId, total }));

    const avgOrderValue = delivered.length > 0 ? deliveredTotal / delivered.length : 0;
    const repeatRate = userIds.length > 0 ? (repeatBuyers.length / userIds.length) * 100 : 0;
    const conversionRate = allOrders.length > 0 ? (delivered.length / allOrders.length) * 100 : 0;

    return {
      totalCustomers: userIds.length,
      activeCustomers: deliveredUserIds.length,
      monthlyNewCustomers: monthlyNewUsers.length,
      repeatCustomers: repeatBuyers.length,
      repeatRate,
      avgOrderValue,
      totalOrders: allOrders.length,
      deliveredOrders: delivered.length,
      cancelledOrders: cancelled.length,
      conversionRate,
      deliveredRevenue: deliveredTotal,
      cancelledRevenue: cancelledTotal,
      topAreas,
      topCustomers,
    };
  }, [allOrders]);

  return (
    <div className="space-y-6">
      <div className="p-4 md:p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
        <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-500" />
          Customer Analytics
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">
          Customer acquisition, retention, and spending insights.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Customers" value={stats.totalCustomers} icon={Users} color="text-indigo-500" bgColor="bg-indigo-100 dark:bg-indigo-900/30"
          subtitle={`${stats.activeCustomers} have placed orders`} />
        <StatCard label="New This Month" value={stats.monthlyNewCustomers} icon={Calendar} color="text-green-500" bgColor="bg-green-100 dark:bg-green-900/30" />
        <StatCard label="Repeat Buyers" value={stats.repeatCustomers} icon={Repeat} color="text-purple-500" bgColor="bg-purple-100 dark:bg-purple-900/30"
          subtitle={`${stats.repeatRate.toFixed(1)}% repeat rate`} />
        <StatCard label="Avg Order Value" value={`₹${stats.avgOrderValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} icon={IndianRupee} color="text-emerald-500" bgColor="bg-emerald-100 dark:bg-emerald-900/30" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={stats.totalOrders} icon={ShoppingBag} color="text-amber-500" bgColor="bg-amber-100 dark:bg-amber-900/30" />
        <StatCard label="Delivered" value={stats.deliveredOrders} icon={TrendingUp} color="text-emerald-500" bgColor="bg-emerald-100 dark:bg-emerald-900/30" />
        <StatCard label="Cancelled" value={stats.cancelledOrders} icon={TrendingUp} color="text-red-500" bgColor="bg-red-100 dark:bg-red-900/30"
          subtitle={`₹${stats.cancelledRevenue.toLocaleString("en-IN")} lost`} />
        <StatCard label="Conversion" value={`${stats.conversionRate.toFixed(1)}%`} icon={TrendingUp} color="text-blue-500" bgColor="bg-blue-100 dark:bg-blue-900/30"
          subtitle={`${stats.deliveredOrders} / ${stats.totalOrders} delivered`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
          <h3 className="font-extrabold text-zinc-900 dark:text-white text-sm flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-rose-500" />
            Top Areas by Revenue
          </h3>
          {stats.topAreas.length === 0 ? (
            <p className="text-xs text-zinc-400 font-semibold italic">No delivery data yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.topAreas.map(([area, data], i) => (
                <div key={area} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-[10px]">{i + 1}</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{area}</span>
                    <span className="text-zinc-400">({data.count} orders)</span>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">₹{data.revenue.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
          <h3 className="font-extrabold text-zinc-900 dark:text-white text-sm flex items-center gap-2 mb-3">
            <IndianRupee className="w-4 h-4 text-amber-500" />
            Top Customers by Spend
          </h3>
          {stats.topCustomers.length === 0 ? (
            <p className="text-xs text-zinc-400 font-semibold italic">No customer data yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.topCustomers.map((c, i) => (
                <div key={c.userId} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-[10px]">{i + 1}</span>
                    <span className="font-mono text-[10px] text-zinc-500">{c.userId.slice(0, 12)}...</span>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">₹{c.total.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
