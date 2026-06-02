// hooks/useEarnings.ts

import { useQuery } from "@tanstack/react-query";
import { collectionGroup, collection, getDocs, getFirestore } from "firebase/firestore";
import { app, auth } from "../firebaseConfig";

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

async function fetchAllOrders(): Promise<any[]> {
  const uid = auth.currentUser?.uid;
  console.log("[EARNINGS] Current user UID:", uid);
  console.log("[EARNINGS] Auth state:", auth.currentUser ? "signed in" : "NOT signed in");

  // METHOD 1: Try collectionGroup (scans ALL users' orders)
  try {
    console.log("[EARNINGS] Trying collectionGroup('orders')...");
    const cgSnap = await getDocs(collectionGroup(db, "orders"));
    console.log("[EARNINGS] collectionGroup returned", cgSnap.size, "docs");
    if (cgSnap.size > 0) {
      const firstDoc = cgSnap.docs[0];
      console.log("[EARNINGS] First doc path:", firstDoc.ref.path);
      console.log("[EARNINGS] First doc data:", JSON.stringify(firstDoc.data()).slice(0, 300));
      return cgSnap.docs;
    }
    console.log("[EARNINGS] collectionGroup returned 0 docs — falling back to subcollection query");
  } catch (cgErr: any) {
    console.error("[EARNINGS] collectionGroup FAILED:", cgErr.code || cgErr.message);
    console.error("[EARNINGS] Full error:", JSON.stringify(cgErr));
  }

  // METHOD 2: Fallback — query the owner's orders subcollection directly
  if (uid) {
    try {
      console.log("[EARNINGS] Fallback: querying users/" + uid + "/orders...");
      const subSnap = await getDocs(collection(db, "users", uid, "orders"));
      console.log("[EARNINGS] Subcollection returned", subSnap.size, "docs");
      if (subSnap.size > 0) {
        console.log("[EARNINGS] First doc data:", JSON.stringify(subSnap.docs[0].data()).slice(0, 300));
      }
      return subSnap.docs;
    } catch (subErr: any) {
      console.error("[EARNINGS] Subcollection query FAILED:", subErr.code || subErr.message);
    }
  }

  // METHOD 3: Fallback — query top-level orders collection
  try {
    console.log("[EARNINGS] Fallback: querying top-level orders...");
    const topSnap = await getDocs(collection(db, "orders"));
    console.log("[EARNINGS] Top-level returned", topSnap.size, "docs");
    return topSnap.docs;
  } catch (topErr: any) {
    console.error("[EARNINGS] Top-level query FAILED:", topErr.code || topErr.message);
  }

  return [];
}

export function useEarnings() {
  return useQuery<EarningsData>({
    queryKey: ["earnings"],
    queryFn: async () => {
      console.log("[EARNINGS] queryFn starting...");

      const allDocs = await fetchAllOrders();
      console.log("[EARNINGS] Total docs fetched:", allDocs.length);

      const workerSnap = await getDocs(collection(db, "workers")).catch(() => ({ docs: [] as any[] }));
      const boysSnap = await getDocs(collection(db, "deliveryBoys")).catch(() => ({ docs: [] as any[] }));

      const workerMap: Record<string, string> = {};
      workerSnap.docs.forEach((d: any) => { workerMap[d.id] = d.data().name || "Unknown"; });
      const boyMap: Record<string, string> = {};
      boysSnap.docs.forEach((d: any) => { boyMap[d.id] = d.data().name || "Unknown"; });

      const rawOrders = allDocs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          userId: d.ref.parent.parent?.id || data.userId || "",
          totalAmount: Number(data.totalAmount) || 0,
          status: data.status || "",
          deliveredAt: toDate(data.deliveredAt),
          createdAt: toDate(data.createdAt),
          paymentMethod: data.payment?.method || data.paymentMethod || "",
          assignedWorkerId: data.assignedWorkerId || null,
          assignedDeliveryBoyId: data.assignedDeliveryBoyId || null,
        };
      });

      console.log("[EARNINGS] rawOrders count:", rawOrders.length);
      if (rawOrders.length > 0) {
        const statuses = [...new Set(rawOrders.map((o: any) => o.status))];
        console.log("[EARNINGS] Status values found:", statuses);
        console.log("[EARNINGS] Sample order:", JSON.stringify(rawOrders[0]));
      }

      const now = new Date();
      const todayStart = getDayStart(now);
      const weekStart = getWeekStart(now);
      const monthStart = getMonthStart(now);

      const delivered = rawOrders.filter((o) => o.status === "Delivered" || o.status === "delivered" || o.status === "Completed" || o.status === "completed");
      console.log("[EARNINGS] Delivered orders:", delivered.length, "of", rawOrders.length);

      const totalDelivered = delivered.length;

      const dateFilter = (o: any, start: Date) => {
        const dt = o.deliveredAt || o.createdAt;
        return dt && dt >= start;
      };

      const todayRevenue = delivered.filter((o) => dateFilter(o, todayStart)).reduce((s, o) => s + o.totalAmount, 0);
      const weekRevenue = delivered.filter((o) => dateFilter(o, weekStart)).reduce((s, o) => s + o.totalAmount, 0);
      const monthRevenue = delivered.filter((o) => dateFilter(o, monthStart)).reduce((s, o) => s + o.totalAmount, 0);
      const totalRevenue = delivered.reduce((s, o) => s + o.totalAmount, 0);

      console.log("[EARNINGS] Revenue — Today:", todayRevenue, "Week:", weekRevenue, "Month:", monthRevenue, "Total:", totalRevenue);

      const todayOrders = delivered.filter((o) => dateFilter(o, todayStart)).length;
      const weekOrders = delivered.filter((o) => dateFilter(o, weekStart)).length;
      const monthOrders = delivered.filter((o) => dateFilter(o, monthStart)).length;

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
        const dayOrders = delivered.filter((o) => { const dt = o.deliveredAt || o.createdAt; return dt && dt >= dayStart && dt < dayEnd; });
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
    staleTime: 30000,
  });
}
