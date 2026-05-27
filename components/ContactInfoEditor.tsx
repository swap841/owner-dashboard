"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Settings, Save, Upload } from "lucide-react";
import { useContactInfoSettings } from "@/hooks/useContacts";
import { ContactInfo } from "@/types";
import { uploadToImgBB } from "@/lib/imageUpload";
import { toast } from "react-hot-toast";

export default function ContactInfoEditor() {
  const { contactInfo, isLoading, updateContactInfo } = useContactInfoSettings();
  const [form, setForm] = useState<Partial<ContactInfo>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (contactInfo && !loaded) {
      setForm(contactInfo);
      setLoaded(true);
    }
  }, [contactInfo, loaded]);

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading("Uploading logo...");
    try {
      const url = await uploadToImgBB(file);
      setForm({ ...form, logoUrl: url });
      toast.success("Logo uploaded!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateContactInfo(form);
      toast.success("Settings saved!");
      setSaving(false);
    } catch {
      toast.error("Failed to save settings.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black bg-gradient-to-r from-gray-600 to-zinc-500 bg-clip-text text-transparent">
          Store Settings
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">Edit store information, contact details, and delivery radius.</p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
          <span className="text-zinc-500 font-semibold text-sm">Loading settings...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 max-w-2xl">
          <h3 className="font-bold text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> General Info</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Store Name</label>
              <input value={form.storeName || ""} onChange={e => setForm({...form, storeName: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-medium" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Logo</label>
              <div className="flex gap-2 items-start">
                <input value={form.logoUrl || ""} onChange={e => setForm({...form, logoUrl: e.target.value})} className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-medium" placeholder="Paste image URL or upload below" />
                <label className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-700 cursor-pointer flex items-center gap-1.5 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "..." : "Browse"}
                  <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
                </label>
              </div>
              {form.logoUrl && (
                <img src={form.logoUrl} alt="Logo preview" className="mt-2 h-12 w-12 rounded-lg object-cover border border-zinc-200" />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Phone</label>
              <input value={form.phone || ""} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-medium" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Email</label>
              <input value={form.email || ""} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-medium" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Address</label>
            <textarea value={form.address || ""} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-medium resize-none" />
          </div>

          {/* Template Content Fields */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> Store Template Text</h3>
            <p className="text-[10px] text-zinc-400 font-medium">Text shown on the customer website homepage, navbar, footer, and about page.</p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Tagline (navbar top bar + footer)</label>
              <input value={form.tagline || ""} onChange={e => setForm({...form, tagline: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-medium" placeholder="e.g. Fresh Grocery Express" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Hero Title (homepage headline)</label>
              <input value={form.heroTitle || ""} onChange={e => setForm({...form, heroTitle: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-medium" placeholder="e.g. Fresh groceries, delivered in 24 hours" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Hero Subtitle (homepage subtext)</label>
              <input value={form.heroSubtitle || ""} onChange={e => setForm({...form, heroSubtitle: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-medium" placeholder="e.g. Farm-fresh produce, dairy, snacks and daily essentials..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">About Page Story Text</label>
              <textarea value={form.aboutText || ""} onChange={e => setForm({...form, aboutText: e.target.value})} rows={4} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-mono resize-y" placeholder="Leave blank for default about story text..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Copyright Text (footer bottom)</label>
              <input value={form.copyrightText || ""} onChange={e => setForm({...form, copyrightText: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-medium" placeholder="e.g. All rights reserved." />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Delivery Radius (km)</label>
              <input type="number" value={form.deliveryRadiusKm || 20} onChange={e => setForm({...form, deliveryRadiusKm: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Warehouse Lat</label>
              <input type="number" step="any" value={form.warehouseLat || ""} onChange={e => setForm({...form, warehouseLat: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Warehouse Lng</label>
              <input type="number" step="any" value={form.warehouseLng || ""} onChange={e => setForm({...form, warehouseLng: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Tax Percentage (%)</label>
              <input type="number" step="0.01" value={form.taxPercentage ?? 0} onChange={e => setForm({...form, taxPercentage: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Delivery Fee Per Km (₹)</label>
              <input type="number" step="0.01" value={form.deliveryFeePerKm ?? 0} onChange={e => setForm({...form, deliveryFeePerKm: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Free Delivery Above (₹)</label>
              <input type="number" step="0.01" value={form.freeDeliveryAbove ?? 0} onChange={e => setForm({...form, freeDeliveryAbove: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Social Links (Instagram, Facebook, etc.)</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(form.socialLinks || {}).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">{key}:</span>
                  <input value={val as string} onChange={e => setForm({...form, socialLinks: {...form.socialLinks, [key]: e.target.value}})} className="bg-transparent text-xs font-medium focus:outline-none w-28" />
                </div>
              ))}
              <button onClick={() => {
                const key = prompt("Social link name (e.g. instagram):");
                if (key) setForm({...form, socialLinks: {...form.socialLinks, [key]: ""}});
              }} className="px-3 py-1.5 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-zinc-600 transition">+ Add Link</button>
            </div>
          </div>

          {/* Policy Content Editors */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> Policy Pages</h3>
            <p className="text-[10px] text-zinc-400 font-medium">HTML content shown on Privacy Policy, Refund Policy, Shipping Policy, and Terms pages. Leave blank to show default content.</p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Privacy Policy (HTML)</label>
              <textarea value={form.privacyPolicy || ""} onChange={e => setForm({...form, privacyPolicy: e.target.value})} rows={8} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-mono resize-y" placeholder="Leave blank for default privacy policy content..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Refund Policy (HTML)</label>
              <textarea value={form.refundPolicy || ""} onChange={e => setForm({...form, refundPolicy: e.target.value})} rows={8} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-mono resize-y" placeholder="Leave blank for default refund policy content..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Shipping Policy (HTML)</label>
              <textarea value={form.shippingPolicy || ""} onChange={e => setForm({...form, shippingPolicy: e.target.value})} rows={8} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-mono resize-y" placeholder="Leave blank for default shipping policy content..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Terms & Conditions (HTML)</label>
              <textarea value={form.termsAndConditions || ""} onChange={e => setForm({...form, termsAndConditions: e.target.value})} rows={8} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500/20 font-mono resize-y" placeholder="Leave blank for default terms content..." />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-800 hover:to-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
