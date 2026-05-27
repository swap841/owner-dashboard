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
  increment,
} from "firebase/firestore";
import { Worker, SalaryPayment } from "../../types";

const db = getFirestore(app);

export async function getWorkers(): Promise<Worker[]> {
  const snap = await getDocs(query(collection(db, "workers"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Worker[];
}

export async function createWorker(worker: Omit<Worker, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "workers"), worker);
  return docRef.id;
}

export async function updateWorker(id: string, updates: Partial<Worker>): Promise<void> {
  const clean = { ...updates };
  delete (clean as any).id;
  await updateDoc(doc(db, "workers", id), clean);
}

export async function deleteWorker(id: string): Promise<void> {
  await deleteDoc(doc(db, "workers", id));
}

export async function payWorkerSalary(workerId: string, payment: Omit<SalaryPayment, "id">): Promise<void> {
  await addDoc(collection(db, "workers", workerId, "salaryPayments"), payment);
  await updateDoc(doc(db, "workers", workerId), {
    totalEarnings: increment(payment.amount),
  });
}

export async function payDeliveryBoySalary(dboyId: string, payment: Omit<SalaryPayment, "id">): Promise<void> {
  await addDoc(collection(db, "deliveryBoys", dboyId, "salaryPayments"), payment);
  await updateDoc(doc(db, "deliveryBoys", dboyId), {
    totalEarnings: increment(payment.amount),
  });
}

export async function getWorkerSalaryPayments(workerId: string): Promise<SalaryPayment[]> {
  const snap = await getDocs(
    query(collection(db, "workers", workerId, "salaryPayments"), orderBy("paidAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SalaryPayment[];
}

export async function getDeliveryBoySalaryPayments(dboyId: string): Promise<SalaryPayment[]> {
  const snap = await getDocs(
    query(collection(db, "deliveryBoys", dboyId, "salaryPayments"), orderBy("paidAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SalaryPayment[];
}
