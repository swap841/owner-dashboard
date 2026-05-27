"use client";

import React, { useState, useRef } from "react";
import { Loader2, Plus, Edit, Trash, Image, Upload } from "lucide-react";
import { useBanners } from "@/hooks/useBanners";
import { Banner } from "@/types";
import { uploadToImgBB } from "@/lib/imageUpload";

export default function BannersManager() {
  const { banners, isLoading, createBanner, updateBanner, deleteBanner } = useBanners();
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState({ imageUrl: "", link: "", active: true });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setForm({ imageUrl: "", link: "", active: true });
    setEditingBanner(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.imageUrl.trim()) return;
    setSaving(true);
    try {
      if (editingBanner) {
        await updateBanner({ id: editingBanner.id!, updates: form });
      } else {
        await createBanner(form);
      }
      resetForm();
    } catch {}
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToImgBB(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err: any) {
      alert(err.message || "Upload failed");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Banner Management
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">Manage promotional banners shown on the customer app.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-500/10">
          <Plus className="w-4 h-4" /> <span>Add Banner</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm">{editingBanner ? "Edit Banner" : "New Banner"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex gap-2">
              <input
                placeholder="Image URL"
                value={form.imageUrl}
                onChange={e => setForm({...form, imageUrl: e.target.value})}
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50 transition shrink-0"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Browse
              </button>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>
            <input placeholder="Link URL (optional)" value={form.link} onChange={e => setForm({...form, link: e.target.value})} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="banner-active" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="rounded" />
            <label htmlFor="banner-active" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Active</label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.imageUrl.trim()} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {editingBanner ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="text-zinc-500 font-semibold text-sm">Loading banners...</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
          <Image className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="text-zinc-950 dark:text-white font-bold">No banners yet</span>
          <p className="text-xs text-zinc-400 mt-1">Add promotional banners displayed on the home screen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b: Banner) => (
            <div key={b.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-xs group">
              <div className="aspect-video bg-zinc-100 relative overflow-hidden">
                <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                {b.link && <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">Linked</span>}
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${b.active ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                  {b.active ? "Active" : "Inactive"}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => { setForm({ imageUrl: b.imageUrl, link: b.link || "", active: b.active }); setEditingBanner(b); setShowForm(true); }} className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 rounded-lg hover:text-purple-500 transition"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (confirm("Delete this banner?")) deleteBanner(b.id!); }} className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 rounded-lg hover:text-rose-500 transition"><Trash className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
