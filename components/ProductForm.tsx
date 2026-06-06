// components/ProductForm.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Product, Category } from "../types";
import { uploadToImgBB } from "../lib/imageUpload";
import { X, Upload, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  onSave: (product: Omit<Product, "id">) => Promise<any>;
  onClose: () => void;
}

export default function ProductForm({ product, categories, onSave, onClose }: ProductFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [weight, setWeight] = useState<number>(100);
  const [unit, setUnit] = useState<string>("g");
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name ?? "");
      setDescription(product.description ?? "");
      setPrice(product.price ?? 0);
      setMrp(product.mrp ?? 0);
      setStock(product.stock ?? 0);
      setWeight(product.weight ?? 100);
      setUnit(product.unit ?? "g");
      setCategoryId(product.categoryId ?? "");
      setImages(product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : []);
      setRating(product.rating ?? 0);
    }
  }, [product]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Uploading image to ImgBB...");
    try {
      const url = await uploadToImgBB(file);
      setImages(prev => [...prev, url]);
      toast.success("Image uploaded successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleAddImageUrl = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setImages(prev => [...prev, url]);
    setNewImageUrl("");
  };

  const handleRemoveImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveImage = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= images.length) return;
    setImages(prev => {
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Product name is required.");
    if (!categoryId) return toast.error("Please select a category.");
    if (price <= 0) return toast.error("Price must be greater than 0.");
    if (mrp < price) return toast.error("MRP must be greater than or equal to current price.");
    if (stock < 0) return toast.error("Stock cannot be negative.");
    if (weight <= 0) return toast.error("Quantity must be greater than 0.");

    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        price,
        mrp,
        stock,
        weight,
        unit,
        categoryId,
        imageUrl: images[0]?.trim() || "/images/generic-product-image.png",
        images,
        lowStockThreshold: 5,
        active: true,
      });
      toast.success(product ? "Product updated successfully!" : "Product created successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/85 max-h-[90vh] flex flex-col transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
            {product ? "✏️ Edit Product" : "🛍️ Add New Product"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                placeholder="e.g. Fresh Organic Bananas"
              />
            </div>

            {/* Category Select */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName || cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Stock *
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                min={0}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              />
            </div>

            {/* Weight/Quantity Value */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Quantity Value *
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                min={1}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              />
            </div>

            {/* Weight Unit */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Unit *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              >
                <optgroup label="Weight">
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                </optgroup>
                <optgroup label="Volume">
                  <option value="ml">Milliliters (ml)</option>
                  <option value="l">Liters (L)</option>
                </optgroup>
                <optgroup label="Count">
                  <option value="pc">Piece (pc)</option>
                  <option value="doz">Dozen (doz)</option>
                  <option value="pack">Pack</option>
                  <option value="bunch">Bunch</option>
                  <option value="bundle">Bundle</option>
                  <option value="set">Set</option>
                </optgroup>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                step="0.01"
                min="0.01"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              />
            </div>

            {/* Original Price */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                MRP / Original Price (₹) *
              </label>
              <input
                type="number"
                value={mrp}
                onChange={(e) => setMrp(Number(e.target.value))}
                step="0.01"
                min="0.01"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              />
            </div>
          </div>

          {/* Rating (auto-computed) */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Rating (auto-computed)
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-semibold text-sm">
              <span className="text-amber-400">★</span>
              <span>{rating > 0 ? rating.toFixed(1) : "No ratings yet"}</span>
              <span className="text-[10px] text-zinc-400 font-medium ml-auto">Auto-computed from reviews</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              placeholder="Provide a detailed description of the product..."
            />
          </div>

          {/* Multiple Images Upload Block */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Product Images ({images.length})
            </label>
            <div className="space-y-3">
              {/* Image list with thumbnails */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700" />
                      <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                        <button type="button" onClick={() => handleMoveImage(idx, -1)} disabled={idx === 0}
                          className="w-6 h-6 bg-white/80 rounded-full flex items-center justify-center text-zinc-700 hover:bg-white disabled:opacity-30 text-xs font-bold">&#8593;</button>
                        <button type="button" onClick={() => handleMoveImage(idx, 1)} disabled={idx === images.length - 1}
                          className="w-6 h-6 bg-white/80 rounded-full flex items-center justify-center text-zinc-700 hover:bg-white disabled:opacity-30 text-xs font-bold">&#8595;</button>
                        <button type="button" onClick={() => handleRemoveImage(idx)}
                          className="w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center text-white hover:bg-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      {idx === 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">Main</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload new image */}
              <div className="border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-800/10">
                <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                <span className="text-[11px] text-zinc-500 font-medium text-center mb-2">Upload new image</span>
                <input type="file" accept="image/*" onChange={handleImageFileChange} disabled={uploading} className="hidden" id="image-file-picker" />
                <label htmlFor="image-file-picker" className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-sm">
                  {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</> : "Upload Image"}
                </label>
              </div>

              {/* Add image URL */}
              <div className="flex items-center gap-2">
                <input type="text" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddImageUrl()}
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
                  placeholder="Or paste an image URL and press Enter" />
                <button type="button" onClick={handleAddImageUrl}
                  className="shrink-0 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 transition flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || submitting}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
