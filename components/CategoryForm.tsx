// components/CategoryForm.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Category } from "../types";
import { uploadToImgBB } from "../lib/imageUpload";
import { X, Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface CategoryFormProps {
  category?: Category | null;
  onSave: (cat: Omit<Category, "id">) => Promise<any>;
  onClose: () => void;
}

export default function CategoryForm({ category, onSave, onClose }: CategoryFormProps) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [order, setOrder] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDisplayName(category.displayName || category.name || "");
      setImageUrl(category.imageUrl || "");
      setOrder(category.order ?? 0);
    }
  }, [category]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Uploading image to ImgBB...");
    try {
      const url = await uploadToImgBB(file);
      setImageUrl(url);
      toast.success("Image uploaded successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Category name is required.");

    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        displayName: displayName.trim() || name.trim(),
        imageUrl: imageUrl.trim() || "/images/generic-category-image.png",
        active: true,
        order,
      });
      toast.success(category ? "Category updated successfully!" : "Category created successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/85 max-h-[90vh] flex flex-col transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
            {category ? "📁 Edit Category" : "📁 Add New Category"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              placeholder="e.g. Vegetables & Herbs"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              placeholder="Shown to customers (e.g. Fresh Vegetables)"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Sort Order
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              min={0}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              placeholder="Lower numbers appear first"
            />
          </div>

          {/* Image Upload Box */}
          <div className="border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-800/10">
            {imageUrl ? (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Category Preview"
                  className="w-20 h-20 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  Remove & Upload New
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-1">
                <Upload className="w-7 h-7 text-zinc-400 mb-1.5" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium text-center">
                  Select a category image to upload to ImgBB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  disabled={uploading}
                  className="hidden"
                  id="cat-image-file-picker"
                />
                <label
                  htmlFor="cat-image-file-picker"
                  className="mt-2.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Image"
                  )}
                </label>
              </div>
            )}
          </div>

          {/* Direct URL */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Or Image URL
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-xs"
              placeholder="e.g. https://images.unsplash.com/... or upload above"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4.5 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || submitting}
              className="px-5.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Category"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
