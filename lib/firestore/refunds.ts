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
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { Refund } from "../../types";

const db = getFirestore(app);

/**
 * Fetch all logged refunds sorted by createdAt date descending
 */
export async function getRefunds(): Promise<Refund[]> {
  const q = query(collection(db, "refunds"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Refund[];
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
