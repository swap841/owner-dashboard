// lib/firestore/refunds.ts

import { app } from "../../firebaseConfig";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { Refund } from "../../types";

const db = getFirestore(app);

/**
 * Fetch all logged refunds sorted by createdAt date descending
 */
export async function getRefunds(): Promise<Refund[]> {
  try {
    const q = query(collection(db, "refunds"));
    const snap = await getDocs(q);
    const refunds = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Refund[];
    refunds.sort((a: any, b: any) => {
      const aT = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
      const bT = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
      return bT - aT;
    });
    return refunds;
  } catch (err) {
    console.error("Failed to fetch refunds:", err);
    return [];
  }
}

/**
 * Record a new refund entry in Firestore
 */
export async function createRefund(refund: Omit<Refund, "id" | "createdAt">): Promise<string> {
  const payload = {
    ...refund,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "refunds"), payload);
  return docRef.id;
}

/**
 * Update the verification status of a refund (Pending, Approved, Rejected)
 */
export async function updateRefundStatus(
  id: string,
  status: string,
  extraUpdates: Partial<Refund> = {}
): Promise<void> {
  const refundRef = doc(db, "refunds", id);
  await updateDoc(refundRef, {
    status,
    ...extraUpdates,
  });
}
