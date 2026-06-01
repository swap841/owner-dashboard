// lib/firestore/products.ts

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
  where,
  writeBatch,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { Product } from "../../types";

const db = getFirestore(app);

/**
 * Fetch all products sorted by name
 */
export async function getProducts(): Promise<Product[]> {
  const q = query(collection(db, "products"), where("active", "==", true), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Product[];
}

/**
 * Create a new product and increment denormalized productCount in category
 */
export async function createProduct(product: Omit<Product, "id">): Promise<string> {
  const productWithTime = {
    ...product,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  return await runTransaction(db, async (transaction) => {
    // 1. Create the product
    const productRef = doc(collection(db, "products"));
    transaction.set(productRef, productWithTime);

    // 2. (Optional category tracking removed - Category type no longer has productCount)
    if (product.categoryId) {
      // categoryId stored on product; no denormalized count on category
    }

    return productRef.id;
  });
}

/**
 * Update product. If category changes, update denormalized productCounts in both old and new categories.
 */
export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const cleanUpdates = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  const productRef = doc(db, "products", id);

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error("Product not found");
    }

    const oldData = productSnap.data() as Product;

    // Check if category changed
    if (updates.categoryId && updates.categoryId !== oldData.categoryId) {
      // Category denormalized counts removed from Category type
    }

    transaction.update(productRef, cleanUpdates);
  });
}

/**
 * Soft-delete: set active to false instead of actually deleting
 */
export async function deleteProduct(id: string): Promise<void> {
  const productRef = doc(db, "products", id);

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error("Product not found");
    }

    transaction.update(productRef, { active: false, updatedAt: serverTimestamp() });
  });
}

/**
 * Alias for deleteProduct – archives the product
 */
export const archiveProduct = deleteProduct;

/**
 * Restore an archived product by setting active back to true
 */
export async function restoreProduct(id: string): Promise<void> {
  const productRef = doc(db, "products", id);

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error("Product not found");
    }

    transaction.update(productRef, { active: true, updatedAt: serverTimestamp() });
  });
}

/**
 * Fetch archived (soft-deleted) products
 */
export async function getArchivedProducts(): Promise<Product[]> {
  const q = query(collection(db, "products"), where("active", "==", false), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Product[];
}

/**
 * Import products from parsed CSV rows.
 */
export async function importProductsFromCSV(rows: Array<{
  name: string;
  price: number;
  mrp: number;
  stock: number;
  weight: number;
  unit: string;
  description: string;
  categoryName: string;
  imageUrl?: string;
}>): Promise<{ importedCount: number; categoryMapping: Record<string, string> }> {
  const categoriesSnap = await getDocs(collection(db, "categories"));
  const categoryMap: Record<string, string> = {};

  categoriesSnap.docs.forEach((doc) => {
    const name = doc.data().name || "";
    categoryMap[name.toLowerCase().trim()] = doc.id;
  });

  const batch = writeBatch(db);
  const productsCol = collection(db, "products");

  let importedCount = 0;

  for (const row of rows) {
    if (!row.name.trim()) continue;

    let categoryId = "";
    const catNameClean = row.categoryName.toLowerCase().trim();

    if (catNameClean && categoryMap[catNameClean]) {
      categoryId = categoryMap[catNameClean];
    } else if (catNameClean) {
      const catRef = doc(collection(db, "categories"));
      categoryId = catRef.id;
      categoryMap[catNameClean] = categoryId;

      batch.set(catRef, {
        name: row.categoryName.trim(),
        imageUrl: "",
        active: true,
        createdAt: serverTimestamp(),
      });
    }

    const prodRef = doc(productsCol);
    const newProduct = {
      name: row.name.trim(),
      description: row.description || "",
      price: Number(row.price) || 0,
      mrp: Number(row.mrp) || 0,
      stock: Number(row.stock) || 0,
      weight: Number(row.weight) || 100,
      unit: row.unit || "g",
      imageUrl: row.imageUrl || "",
      categoryId: categoryId,
      lowStockThreshold: 5,
      active: true,
      createdAt: serverTimestamp(),
    };

    batch.set(prodRef, newProduct);
    importedCount++;
  }

  await batch.commit();

  return {
    importedCount,
    categoryMapping: categoryMap,
  };
}

/**
 * Format products into standard comma-separated CSV string for export.
 */
export function exportProductsToCSV(products: Product[], categories: Record<string, string>): string {
  const headers = ["Product Name", "Price (INR)", "MRP (INR)", "Stock", "Weight", "Unit", "Category", "Image URL", "Description"];
  const rows = products.map((p) => {
    const categoryName = categories[p.categoryId] || "Uncategorized";
    const cleanDesc = (p.description || "").replace(/"/g, '""');
    return [
      `"${p.name}"`,
      p.price,
      p.mrp,
      p.stock,
      p.weight,
      `"${p.unit}"`,
      `"${categoryName}"`,
      `"${p.imageUrl || ""}"`,
      `"${cleanDesc}"`,
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
