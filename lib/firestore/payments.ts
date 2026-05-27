// lib/firestore/payments.ts

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
import { Payment } from "../../types";

const db = getFirestore(app);

/**
 * Fetch all payment records for Razorpay reconciliation sorted by date descending
 */
export async function getPayments(): Promise<Payment[]> {
  const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Payment[];
}

/**
 * Create or record a new transaction details document in Firestore
 */
export async function recordPayment(payment: Omit<Payment, "id" | "createdAt">): Promise<string> {
  const payload = {
    ...payment,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "payments"), payload);
  return docRef.id;
}

/**
 * Update transaction status (e.g. "captured" -> "refunded")
 */
export async function updatePaymentStatus(id: string, status: string): Promise<void> {
  const paymentRef = doc(db, "payments", id);
  await updateDoc(paymentRef, { status });
}
