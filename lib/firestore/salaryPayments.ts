import { app } from "../../firebaseConfig";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  increment,
} from "firebase/firestore";
import { SalaryPayment } from "../../types";

const db = getFirestore(app);

export async function paySalary(
  col: "workers" | "deliveryBoys",
  personId: string,
  payment: Omit<SalaryPayment, "id">
): Promise<void> {
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
