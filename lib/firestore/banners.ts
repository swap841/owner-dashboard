import { app } from "../../firebaseConfig";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { Banner } from "../../types";

const db = getFirestore(app);

export async function getBanners(): Promise<Banner[]> {
  const snap = await getDocs(collection(db, "banners"));
  const banners = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Banner[];
  banners.sort((a: any, b: any) => (a.order ?? 99) - (b.order ?? 99));
  return banners;
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
