// lib/firestore/orders.ts

import { app } from "../../firebaseConfig";
import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  runTransaction,
  writeBatch,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { Order, OrderStatus, DeliveryBoy } from "../../types";
import { extractAreaCode } from "../areaCode";

const db = getFirestore(app);

export interface PaginatedOrdersResult {
  orders: Order[];
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Normalizes a Firestore order document into a clean Order interface.
 */
export function normalizeOrder(docId: string, userId: string | undefined, data: any): Order {
  const items = Array.isArray(data.items) ? data.items : [];
  
  // Recalculate total weight from items just to ensure robustness
  const totalWeight = items.reduce((sum: number, item: any) => {
    const itemWeight = item.weight || 0;
    const itemQuantity = item.quantity || 0;
    return sum + itemWeight * itemQuantity;
  }, 0);

  const address = data.deliveryAddress || data.address || "N/A";
  const areaCode = data.areaCode || extractAreaCode(address);

  const addr = data.address || { name: data.name || "", phone: data.phone || "", addressLine: data.deliveryAddress || "", pincode: "", city: "" };

  return {
    id: docId,
    userId: userId || "unknown",
    address: addr,
    items: items.map((i: any) => ({
      productId: i.productId || i.id || "",
      name: i.name || "Unknown Product",
      quantity: Number(i.quantity) || 0,
      price: Number(i.price) || 0,
      weight: Number(i.weight) || 0,
    })),
    totalAmount: Number(data.totalAmount || 0),
    totalWeight: totalWeight,
    status: (data.status as OrderStatus) || "Pending",
    areaCode: areaCode,
    payment: {
      method: data.payment?.method || (data.paymentMethod === "RAZORPAY" ? "razorpay" : "cod"),
      razorpayPaymentId: data.payment?.razorpayPaymentId || data.razorpayPaymentId || undefined,
      razorpayOrderId: data.payment?.razorpayOrderId || data.razorpayOrderId || undefined,
      status: data.payment?.status || (data.isPaid ? "paid" : "pending"),
    },
    assignedDeliveryBoyId: data.assignedDeliveryBoyId || data.deliveryBoyId || undefined,
    outOfCity: !!data.outOfCity,
    rejectionHistory: data.rejectionHistory || [],
    ticketContactId: data.ticketContactId || undefined,
    createdAt: data.createdAt || data.date || null,
  };
}

/**
 * Fetches active/undelivered orders paginated.
 * Uses collectionGroup query across all users' subcollections.
 */
export async function getActiveOrders(): Promise<PaginatedOrdersResult> {
  const activeStatuses: OrderStatus[] = [
    "Pending",
    "Packing",
    "Assigned",
    "Accepted",
    "Ready to Dispatch",
    "Out for Delivery",
    "Awaiting Verification",
  ];
  const activeStatusesLower = activeStatuses.map(s => s.toLowerCase());

  // Use bare collectionGroup query (no where filter — avoids composite index on Spark plan)
  // Filter client-side by status
  const q = query(collectionGroup(db, "orders"));

  const snap = await getDocs(q);
  const orders: Order[] = [];

  snap.docs.forEach((d) => {
    const data = d.data();
    const status = (data.status || "").toLowerCase();
    if (activeStatusesLower.includes(status)) {
      const userId = d.ref.parent.parent?.id || data.userId || "N/A";
      orders.push(normalizeOrder(d.id, userId, data));
    }
  });

  // Sort client-side by createdAt descending
  orders.sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  const hasMore = false; // Not paginated — all active orders returned

  return {
    orders,
    lastVisible,
    hasMore,
  };
}

/**
 * Fetches ALL orders across the database, optionally filtered by status (unpaginated/paginated helper for analytics).
 */
export async function getAllOrdersGroup(): Promise<Order[]> {
  // Use bare collectionGroup query (no where filter — avoids composite index on Spark plan)
  const q = query(collectionGroup(db, "orders"));
  const snap = await getDocs(q);
  const orders = snap.docs.map((d) => {
    const data = d.data();
    const userId = d.ref.parent.parent?.id || data.userId || "N/A";
    return normalizeOrder(d.id, userId, data);
  });
  // Sort client-side by createdAt descending
  orders.sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  return orders;
}

/**
 * Update the status of an order
 */
export async function updateOrderStatus(
  userId: string,
  orderId: string,
  status: OrderStatus,
  extraFields: Partial<Order> = {}
): Promise<void> {
  const orderRef = doc(db, "users", userId, "orders", orderId);
  const updates: any = {
    status,
    ...extraFields,
  };

  // Auto-set deliveredAt when status changes to Delivered
  if (status === "Delivered") {
    updates.deliveredAt = serverTimestamp();
  }

  await updateDoc(orderRef, updates);
}

/**
 * Group orders with status "Ready to Dispatch" and no deliveryBoyId into pincode-specific baskets.
 * Each basket respects a maximum weight capacity of 10,000g (10kg).
 */
export interface DeliveryBasket {
  basketId: string;
  areaCode: string;
  totalWeight: number; // in grams
  totalAmount: number;
  orders: Order[];
}

export function groupOrdersIntoBaskets(orders: Order[]): DeliveryBasket[] {
  // 1. Filter: "Ready to Dispatch" and unassigned
  const readyOrders = orders.filter(
    (o) => o.status === "Ready to Dispatch" && !o.assignedDeliveryBoyId
  );

  // 2. Group by Area Code
  const areaGroups: Record<string, Order[]> = {};
  readyOrders.forEach((o) => {
    const area = o.areaCode || "AREA_UNKNOWN";
    if (!areaGroups[area]) {
      areaGroups[area] = [];
    }
    areaGroups[area].push(o);
  });

  const baskets: DeliveryBasket[] = [];
  const MAX_BASKET_WEIGHT = 10000; // 10,000 grams = 10 kg

  // 3. Bin-pack orders for each area code
  Object.entries(areaGroups).forEach(([areaCode, areaOrders]) => {
    // Sort orders by weight descending for simple greedy heuristic packing
    const sortedOrders = [...areaOrders].sort((a, b) => b.totalWeight - a.totalWeight);

    let basketIndex = 1;
    let currentBasketOrders: Order[] = [];
    let currentWeight = 0;
    let currentAmount = 0;

    const pushCurrentBasket = () => {
      if (currentBasketOrders.length > 0) {
        baskets.push({
          basketId: `BASKET-${areaCode}-${basketIndex}`,
          areaCode,
          totalWeight: currentWeight,
          totalAmount: currentAmount,
          orders: [...currentBasketOrders],
        });
        basketIndex++;
      }
    };

    sortedOrders.forEach((order) => {
      // If single order exceeds 10kg, it gets its own basket
      if (order.totalWeight > MAX_BASKET_WEIGHT) {
        pushCurrentBasket(); // clear current if any
        baskets.push({
          basketId: `BASKET-${areaCode}-${basketIndex}`,
          areaCode,
          totalWeight: order.totalWeight,
          totalAmount: order.totalAmount,
          orders: [order],
        });
        basketIndex++;
        // Reset working basket parameters
        currentBasketOrders = [];
        currentWeight = 0;
        currentAmount = 0;
      }
      // If adding this order fits in the current basket
      else if (currentWeight + order.totalWeight <= MAX_BASKET_WEIGHT) {
        currentBasketOrders.push(order);
        currentWeight += order.totalWeight;
        currentAmount += order.totalAmount;
      }
      // If it doesn't fit, push the current basket and start a new one
      else {
        pushCurrentBasket();
        currentBasketOrders = [order];
        currentWeight = order.totalWeight;
        currentAmount = order.totalAmount;
      }
    });

    // Push the last basket if it has any orders
    pushCurrentBasket();
  });

  return baskets;
}

/**
 * Dispatch a complete basket to a delivery boy.
 * Updates all orders inside the basket to "Assigned" with driver details,
 * adds each order to the delivery boy's subcollection basket,
 * and sets the delivery boy's status to "On Delivery".
 */
export async function dispatchBasket(
  basket: DeliveryBasket,
  dboyId: string,
  dboyName: string
): Promise<void> {
  const batch = writeBatch(db);

  // 1. Loop through all orders in the basket
  for (const order of basket.orders) {
    if (!order.id || !order.userId) continue;

    // A. Update Order document status to Assigned and set driver details
    const orderRef = doc(db, "users", order.userId, "orders", order.id);
    batch.update(orderRef, {
      status: "Assigned",
      assignedDeliveryBoyId: dboyId,
    });

    // B. Add to delivery boy's basket subcollection
    const dboyBasketRef = doc(db, "deliveryBoys", dboyId, "basket", order.id);
    batch.set(dboyBasketRef, {
      orderId: order.id,
      userId: order.userId,
      name: order.address?.name || "",
      address: order.address?.addressLine || "",
      totalAmount: order.totalAmount,
      weight: order.totalWeight,
    });
  }

  // 2. Commit batch write transactionally
  await batch.commit();
}

/**
 * Generates CSV content from a list of orders for export.
 */
export function exportOrdersToCSV(orders: Order[]): string {
  const headers = [
    "Order ID", "Status", "Total (INR)", "Payment Method", "Payment Status",
    "Customer Name", "Customer Phone", "Address", "Area Code",
    "Items Count", "Total Weight (g)",
    "Assigned Worker", "Assigned Delivery Boy",
    "Created At", "Delivered At", "Cancelled At",
    "Out of City", "Cancel Reason",
    "Actual Payment Method", "Actual Collected",
    "Reconciliation Status", "Difference",
  ];

  const safe = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = orders.map((o) => {
    const tsStr = (ts: any) => {
      if (!ts) return "";
      if (ts?.toDate) return ts.toDate().toISOString();
      if (ts?.seconds) return new Date(ts.seconds * 1000).toISOString();
      return String(ts);
    };

    return [
      safe(o.id),
      safe(o.status),
      o.totalAmount || 0,
      safe(o.payment?.method),
      safe(o.payment?.status),
      safe(o.address?.name),
      safe(o.address?.phone),
      safe(o.address?.addressLine),
      safe(o.areaCode),
      o.items?.length || 0,
      o.totalWeight || 0,
      safe(o.assignedWorkerId),
      safe(o.assignedDeliveryBoyId),
      tsStr(o.createdAt),
      tsStr(o.deliveredAt),
      tsStr(o.cancelledAt),
      o.outOfCity ? "Yes" : "No",
      safe(o.cancelReason),
      safe(o.actualPayment?.method),
      o.actualPayment?.totalCollected || 0,
      safe(o.reconciliation?.status),
      o.reconciliation?.difference || 0,
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
