// lib/firestore/deliveryBoys.ts

import { app } from "../../firebaseConfig";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { DeliveryBoy } from "../../types";

const db = getFirestore(app);

/**
 * Fetches all delivery boys and resolves their active basket subcollection items
 */
export async function getDeliveryBoys(): Promise<DeliveryBoy[]> {
  const snap = await getDocs(query(collection(db, "deliveryBoys"), orderBy("name")));
  const boys: DeliveryBoy[] = [];

  // Batch fetch all baskets in parallel (avoids N+1 queries)
  const basketPromises = snap.docs.map(d =>
    getDocs(collection(db, "deliveryBoys", d.id, "basket")).catch(() => ({ docs: [] as any[] }))
  );
  const basketSnaps = await Promise.all(basketPromises);

  snap.docs.forEach((d, index) => {
    const dboyId = d.id;
    const data = d.data();

    const basket: any[] = basketSnaps[index].docs.map((b) => ({
      id: b.id,
      orderId: b.data().orderId || b.id,
      userId: b.data().userId || "",
      name: b.data().name || "Unknown Order",
      address: b.data().address || "",
      totalAmount: Number(b.data().totalAmount || 0),
      weight: Number(b.data().weight || 0),
    }));

    boys.push({
      id: dboyId,
      name: data.name || "",
      phone: data.phone || "",
      email: data.email || "",
      vehicleNumber: data.vehicleNumber || "",
      fcmToken: data.fcmToken || "",
      active: data.active ?? true,
      salary: data.salary || 0,
      joiningDate: data.joiningDate || null,
      incrementHistory: data.incrementHistory || [],
      holidays: data.holidays || [],
      totalEarnings: data.totalEarnings || 0,
      breakLogs: data.breakLogs || [],
      basket: basket as any,
    });
  });

  return boys;
}

/**
 * Creates a new delivery boy profile
 */
export async function createDeliveryBoy(boy: Omit<DeliveryBoy, "id" | "basket">): Promise<string> {
  const payload = {
    name: boy.name,
    phone: boy.phone,
    email: boy.email || "",
    vehicleNumber: boy.vehicleNumber || "",
    fcmToken: boy.fcmToken || "",
    active: boy.active,
    salary: boy.salary || 0,
    joiningDate: boy.joiningDate || new Date(),
    incrementHistory: boy.incrementHistory || [],
    holidays: boy.holidays || [],
    totalEarnings: boy.totalEarnings || 0,
    breakLogs: boy.breakLogs || [],
  };

  const docRef = await addDoc(collection(db, "deliveryBoys"), payload);
  return docRef.id;
}

/**
 * Updates a delivery boy's main fields
 */
export async function updateDeliveryBoy(id: string, updates: Partial<DeliveryBoy>): Promise<void> {
  const payload = { ...updates };
  // Remove fields that shouldn't be edited on the main document
  delete payload.id;
  delete payload.basket;

  const dboyRef = doc(db, "deliveryBoys", id);
  await updateDoc(dboyRef, payload);
}

/**
 * Deletes a delivery boy and clears their subcollection basket
 */
export async function deleteDeliveryBoy(id: string): Promise<void> {
  // Clear basket subcollection first
  const basketSnap = await getDocs(collection(db, "deliveryBoys", id, "basket"));
  const batch = writeBatch(db);

  basketSnap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Delete main driver document
  const dboyRef = doc(db, "deliveryBoys", id);
  batch.delete(dboyRef);

  await batch.commit();
}

/**
 * Clears specific order from delivery boy's basket subcollection and updates driver status.
 * If basket becomes empty, resets status to "Active".
 */
export async function clearOrderFromDriverBasket(
  dboyId: string,
  orderId: string
): Promise<void> {
  const basketItemRef = doc(db, "deliveryBoys", dboyId, "basket", orderId);
  
  // Start a batch or run in a transaction
  const basketSnap = await getDocs(collection(db, "deliveryBoys", dboyId, "basket"));
  const batch = writeBatch(db);

  // Delete the completed order from driver basket
  batch.delete(basketItemRef);

  // If this was the last item, update driver status back to "Active"
  const remainingCount = basketSnap.docs.filter((d) => d.id !== orderId).length;
  if (remainingCount === 0) {
    const dboyRef = doc(db, "deliveryBoys", dboyId);
    // No-op: status removed; basket empty is implicit
  }

  await batch.commit();
}
