// components/EarningsAnalyticsView.tsx

"use client";

import { useEarnings, StaffPerf, DailyRevenue } from "@/hooks/useEarnings";
import {
  IndianRupee, TrendingUp, Package, Coins, Wallet, CreditCard,
  Users, Bike, Loader2, Calendar, ArrowUpRight, Clock,
} from "lucide-react";

function StatCard({
  label, value, prefix, icon: Icon, color, bgColor,
}: {
  label: string;
  value: string | number;
  prefix?: string;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-between shadow-xs">
      <div className="space-y-1">
        <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">{label}</span>
        <h3 className="text-2xl font-black text-zinc-950 dark:text-white flex items-center gap-0.5">
          {prefix && <span className="text-base text-zinc-400 font-bold">{prefix}</span>}
          <span>{typeof value === "number" ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : value}</span>
        </h3>
      </div>
      <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function StaffTable({ title, icon: Icon, data, color }: { title: string; icon: any; data: StaffPerf[]; color: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
      <h3 className="font-extrabold text-zinc-900 dark:text-white text-sm flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        {title}
      </h3>
      {data.length === 0 ? (
        <p className="text-xs text-zinc-400 font-semibold italic">No data available.</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {data.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-xs">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{p.name}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-black text-zinc-500">{p.orderCount} orders</span>
                {p.lastActivity && (
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {p.lastActivity.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RevenueBarChart({ data }: { data: DailyRevenue[] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
      <h3 className="font-extrabold text-zinc-900 dark:text-white text-base mb-4">Daily Revenue Trend (Last 7 Days)</h3>
      <div className="w-full h-56 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 flex items-end relative overflow-hidden">
        <div className="absolute inset-0 grid grid-rows-4 divide-y divide-zinc-200/20 dark:divide-zinc-800/10 pointer-events-none p-4" />
        <div className="w-full h-full flex items-end justify-around gap-2 z-10 pt-6">
          {data.map((d, i) => {
            const pct = Math.max(8, (d.revenue / maxRevenue) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer h-full justify-end">
                <span className="text-[10px] text-zinc-400 font-extrabold opacity-0 group-hover:opacity-100 transition">
                  ₹{d.revenue.toLocaleString("en-IN")}
                </span>
                <div
                  style={{ height: `${pct}%` }}
                  className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-lg group-hover:from-emerald-600 group-hover:to-teal-500 shadow-md shadow-emerald-500/10 transition-all duration-300 min-h-[8px]"
                />
                <span className="text-[10px] text-zinc-500 font-black uppercase text-center leading-tight">{d.date}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function EarningsAnalyticsView() {
  const { data, isLoading, error } = useEarnings();

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 font-semibold text-sm">Loading earnings data...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <span className="text-rose-500 font-bold text-sm">Failed to load earnings data.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          Earnings & Performance Analytics
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">
          Real-time dashboard revenue metrics, transaction rates, and staff performance.
        </p>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Revenue" value={data.todayRevenue} icon={IndianRupee} color="text-emerald-500" bgColor="bg-emerald-500/10" />
        <StatCard label="This Week" value={data.weekRevenue} icon={TrendingUp} color="text-teal-500" bgColor="bg-teal-500/10" />
        <StatCard label="This Month" value={data.monthRevenue} icon={Calendar} color="text-violet-500" bgColor="bg-violet-500/10" />
        <StatCard label="All Time Revenue" value={data.totalRevenue} icon={Coins} color="text-amber-500" bgColor="bg-amber-500/10" />
      </div>

      {/* Orders Summary + Payment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
          <h3 className="font-extrabold text-zinc-900 dark:text-white text-sm flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-emerald-500" />
            Orders Summary
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <span className="text-[10px] text-zinc-400 font-black uppercase">Today</span>
              <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">{data.todayOrders}</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <span className="text-[10px] text-zinc-400 font-black uppercase">This Week</span>
              <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">{data.weekOrders}</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <span className="text-[10px] text-zinc-400 font-black uppercase">This Month</span>
              <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">{data.monthOrders}</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <span className="text-[10px] text-zinc-400 font-black uppercase">Avg Order Value</span>
              <p className="text-xl font-black text-zinc-900 dark:text-white mt-1 flex items-center gap-0.5">
                <IndianRupee className="w-4 h-4 text-zinc-400" />
                {data.avgOrderValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
          <h3 className="font-extrabold text-zinc-900 dark:text-white text-sm flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-emerald-500" />
            Payment Split
          </h3>
          <div className="space-y-4">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-zinc-900 dark:text-white">COD</p>
                  <p className="text-[10px] text-zinc-400 font-medium">{data.codOrders} orders</p>
                </div>
              </div>
              <span className="font-black text-zinc-900 dark:text-white">₹{data.codRevenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-zinc-900 dark:text-white">Razorpay</p>
                  <p className="text-[10px] text-zinc-400 font-medium">{data.razorpayOrders} orders</p>
                </div>
              </div>
              <span className="font-black text-zinc-900 dark:text-white">₹{data.razorpayRevenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
            </div>
            {data.totalRevenue > 0 && (
              <div className="flex gap-1 h-2">
                <div
                  className="bg-amber-400 rounded-full transition-all"
                  style={{ width: `${(data.codRevenue / data.totalRevenue) * 100}%` }}
                />
                <div
                  className="bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(data.razorpayRevenue / data.totalRevenue) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaffTable title="Workers Performance" icon={Users} data={data.workers} color="text-orange-500" />
        <StaffTable title="Delivery Boys Performance" icon={Bike} data={data.deliveryBoys} color="text-blue-500" />
      </div>

      {/* Revenue Chart */}
      <RevenueBarChart data={data.dailyRevenue} />
    </div>
  );
}
