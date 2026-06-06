// lib/firestore/categories.ts

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
  where,
  serverTimestamp,
} from "firebase/firestore";
import { Category } from "../../types";

const db = getFirestore(app);

/**
 * Fetch all categories sorted by name
 */
export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, "categories"));
  const snap = await getDocs(q);
  const cats = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Category[];
  cats.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return cats;
}

/**
 * Create a new category
 */
export async function createCategory(category: Omit<Category, "id">): Promise<string> {
  const payload = {
    ...category,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "categories"), payload);
  return docRef.id;
}

/**
 * Update an existing category
 */
export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  const categoryRef = doc(db, "categories", id);
  await updateDoc(categoryRef, payload);
}

/**
 * Delete a category and clear categoryId from all products referencing it
 */
export async function deleteCategory(id: string): Promise<void> {
  // Clear categoryId from products that reference this category
  const productsQuery = query(collection(db, "products"), where("categoryId", "==", id));
  const productsSnap = await getDocs(productsQuery);
  const batchUpdates = productsSnap.docs.map((productDoc) =>
    updateDoc(doc(db, "products", productDoc.id), { categoryId: "" })
  );
  await Promise.all(batchUpdates);

  // Delete the category
  const categoryRef = doc(db, "categories", id);
  await deleteDoc(categoryRef);
}
