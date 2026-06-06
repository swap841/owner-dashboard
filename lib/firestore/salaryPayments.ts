import { app } from "../../firebaseConfig";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  increment,
} from "firebase/firestore";
import { SalaryPayment } from "../../types";

const db = getFirestore(app);
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "";

export async function paySalary(
  col: "workers" | "deliveryBoys",
  personId: string,
  payment: Omit<SalaryPayment, "id">
): Promise<void> {
  if (SERVER_URL) {
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${SERVER_URL}/paySalary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        collection: col,
        personId,
        amount: payment.amount,
        monthYear: payment.monthYear,
        mode: payment.mode,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to pay salary");
    }
    return;
  }

  // Fallback: direct Firestore (for local dev without server)
  const { addDoc, updateDoc } = await import("firebase/firestore");
  await addDoc(collection(db, col, personId, "salaryPayments"), payment);
  await updateDoc(doc(db, col, personId), {
    totalEarnings: increment(payment.amount),
  });
}

export async function getSalaryPayments(
  col: "workers" | "deliveryBoys",
  personId: string
): Promise<SalaryPayment[]> {
  const snap = await getDocs(
    query(collection(db, col, personId, "salaryPayments"), orderBy("paidAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SalaryPayment[];
}
