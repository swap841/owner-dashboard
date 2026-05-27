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
  serverTimestamp,
} from "firebase/firestore";
import { Coupon } from "../../types";

const db = getFirestore(app);

export async function getCoupons(): Promise<Coupon[]> {
  const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Coupon[];
}

export async function createCoupon(coupon: Omit<Coupon, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "coupons"), {
    ...coupon,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCoupon(id: string, updates: Partial<Coupon>): Promise<void> {
  await updateDoc(doc(db, "coupons", id), updates);
}

export async function deleteCoupon(id: string): Promise<void> {
  await deleteDoc(doc(db, "coupons", id));
}
