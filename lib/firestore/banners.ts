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
} from "firebase/firestore";
import { Banner } from "../../types";

const db = getFirestore(app);

export async function getBanners(): Promise<Banner[]> {
  const snap = await getDocs(query(collection(db, "banners"), orderBy("imageUrl")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Banner[];
}

export async function createBanner(banner: Omit<Banner, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "banners"), banner);
  return docRef.id;
}

export async function updateBanner(id: string, updates: Partial<Banner>): Promise<void> {
  const clean = { ...updates };
  delete (clean as any).id;
  await updateDoc(doc(db, "banners", id), clean);
}

export async function deleteBanner(id: string): Promise<void> {
  await deleteDoc(doc(db, "banners", id));
}
