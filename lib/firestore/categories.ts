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
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { Category } from "../../types";

const db = getFirestore(app);

/**
 * Fetch all categories sorted by name
 */
export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, "categories"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Category[];
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
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  const categoryRef = doc(db, "categories", id);
  await deleteDoc(categoryRef);
}
