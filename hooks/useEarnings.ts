// hooks/useEarnings.ts

import { useQuery } from "@tanstack/react-query";
import { collectionGroup, collection, getDocs, getFirestore, query } from "firebase/firestore";
import { app } from "../firebaseConfig";

const db = getFirestore(app);

function toDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val);
  if (val.seconds) return new Date(val.seconds * 1000);
  return null;
}

function getDayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return getDayStart(new Date(d.getFullYear(), d.getMonth(), diff));
}

function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export interface StaffPerf {
  id: string;
  name: string;
  orderCount: number;
  lastActivity: Date | null;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  count: number;
}

export interface EarningsData {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  totalOrders: number;
  avgOrderValue: number;
  codRevenue: number;
  razorpayRevenue: number;
  codOrders: number;
  razorpayOrders: number;
  workers: StaffPerf[];
  deliveryBoys: StaffPerf[];
  dailyRevenue: DailyRevenue[];
}

export function useEarnings() {
  return useQuery<EarningsData>({
    queryKey: ["earnings"],
    queryFn: async () => {
      const [ordersSnap, workersSnap, boysSnap] = await Promise.all([
        getDocs(query(collectionGroup(db, "orders"))),
        getDocs(collection(db, "workers")),
        getDocs(collection(db, "deliveryBoys")),
      ]);

      const workerMap: Record<string, string> = {};
      workersSnap.docs.forEach((d) => { workerMap[d.id] = d.data().name || "Unknown"; });
      const boyMap: Record<string, string> = {};
      boysSnap.docs.forEach((d) => { boyMap[d.id] = d.data().name || "Unknown"; });

      const rawOrders = ordersSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: d.ref.parent.parent?.id || "",
          totalAmount: Number(data.totalAmount) || 0,
          status: data.status || "",
          deliveredAt: toDate(data.deliveredAt),
          createdAt: toDate(data.createdAt),
          paymentMethod: data.payment?.method || data.paymentMethod || "",
          assignedWorkerId: data.assignedWorkerId || null,
          assignedDeliveryBoyId: data.assignedDeliveryBoyId || null,
        };
      });

      const now = new Date();
      const todayStart = getDayStart(now);
      const weekStart = getWeekStart(now);
      const monthStart = getMonthStart(now);

      const delivered = rawOrders.filter((o) => o.status === "Delivered");
      const totalDelivered = delivered.length;

      const todayRevenue = delivered
        .filter((o) => o.deliveredAt && o.deliveredAt >= todayStart)
        .reduce((s, o) => s + o.totalAmount, 0);
      const weekRevenue = delivered
        .filter((o) => o.deliveredAt && o.deliveredAt >= weekStart)
        .reduce((s, o) => s + o.totalAmount, 0);
      const monthRevenue = delivered
        .filter((o) => o.deliveredAt && o.deliveredAt >= monthStart)
        .reduce((s, o) => s + o.totalAmount, 0);
      const totalRevenue = delivered.reduce((s, o) => s + o.totalAmount, 0);

      const todayOrders = delivered.filter((o) => o.deliveredAt && o.deliveredAt >= todayStart).length;
      const weekOrders = delivered.filter((o) => o.deliveredAt && o.deliveredAt >= weekStart).length;
      const monthOrders = delivered.filter((o) => o.deliveredAt && o.deliveredAt >= monthStart).length;

      const avgOrderValue = totalDelivered > 0 ? totalRevenue / totalDelivered : 0;

      const codDelivered = delivered.filter((o) => o.paymentMethod === "cod");
      const rzpDelivered = delivered.filter((o) => o.paymentMethod === "razorpay");
      const codRevenue = codDelivered.reduce((s, o) => s + o.totalAmount, 0);
      const razorpayRevenue = rzpDelivered.reduce((s, o) => s + o.totalAmount, 0);

      const workerAgg: Record<string, { count: number; last: Date | null }> = {};
      delivered.forEach((o) => {
        if (o.assignedWorkerId) {
          if (!workerAgg[o.assignedWorkerId]) workerAgg[o.assignedWorkerId] = { count: 0, last: null };
          workerAgg[o.assignedWorkerId].count++;
          if (o.deliveredAt && (!workerAgg[o.assignedWorkerId].last || o.deliveredAt > workerAgg[o.assignedWorkerId].last!)) {
            workerAgg[o.assignedWorkerId].last = o.deliveredAt;
          }
        }
      });
      const workers: StaffPerf[] = Object.entries(workerAgg)
        .map(([id, perf]) => ({ id, name: workerMap[id] || "Unknown", orderCount: perf.count, lastActivity: perf.last }))
        .sort((a, b) => b.orderCount - a.orderCount);

      const boyAgg: Record<string, { count: number; last: Date | null }> = {};
      delivered.forEach((o) => {
        if (o.assignedDeliveryBoyId) {
          if (!boyAgg[o.assignedDeliveryBoyId]) boyAgg[o.assignedDeliveryBoyId] = { count: 0, last: null };
          boyAgg[o.assignedDeliveryBoyId].count++;
          if (o.deliveredAt && (!boyAgg[o.assignedDeliveryBoyId].last || o.deliveredAt > boyAgg[o.assignedDeliveryBoyId].last!)) {
            boyAgg[o.assignedDeliveryBoyId].last = o.deliveredAt;
          }
        }
      });
      const deliveryBoys: StaffPerf[] = Object.entries(boyAgg)
        .map(([id, perf]) => ({ id, name: boyMap[id] || "Unknown", orderCount: perf.count, lastActivity: perf.last }))
        .sort((a, b) => b.orderCount - a.orderCount);

      const dailyRevenue: DailyRevenue[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayStart = getDayStart(date);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const dayOrders = delivered.filter((o) => o.deliveredAt && o.deliveredAt >= dayStart && o.deliveredAt < dayEnd);
        const dayLabel = dayStart.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
        dailyRevenue.push({
          date: dayLabel,
          revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
          count: dayOrders.length,
        });
      }

      return {
        todayRevenue, weekRevenue, monthRevenue, totalRevenue,
        todayOrders, weekOrders, monthOrders, totalOrders: totalDelivered,
        avgOrderValue,
        codRevenue, razorpayRevenue, codOrders: codDelivered.length, razorpayOrders: rzpDelivered.length,
        workers, deliveryBoys, dailyRevenue,
      };
    },
    staleTime: 60000,
  });
}
