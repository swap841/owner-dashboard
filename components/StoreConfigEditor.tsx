"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Save, Globe, Store, Settings2, ToggleLeft, Shield, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";

interface AppConfig {
  branding: Record<string, any>;
  store: Record<string, any>;
  features: Record<string, any>;
  seo: Record<string, any>;
  contact: Record<string, any>;
  ai: Record<string, any>;
}

export default function StoreConfigEditor() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "https://grocery-server-10ct.onrender.com";

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/config`);
      const data = await res.json();
      if (data && data.id) {
        setConfig(data);
      } else {
        setConfig({
          branding: { storeName: "", logoUrl: "", faviconUrl: "", primaryColor: "#059669", accentColor: "#0D9488", font: "" },
          store: { isOpen: true, maintenanceMode: false, minOrderValue: 199, deliveryCharge: 40, freeDeliveryAbove: 499, taxPercent: 5 },
          features: { voiceSearch: true, wishlist: true, coupons: true, reviews: true, chatbot: true, loyalty: false },
          seo: { metaTitle: "", metaDescription: "" },
          contact: { phone: "", email: "", address: "" },
          ai: { geminiApiKey: "" },
        });
      }
    } catch (err) {
      toast.error("Failed to fetch config");
    } finally {
      setLoading(false);
    }
  };

  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch(`${serverUrl}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Config saved! Cache cleared.");
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch (err) {
      toast.error("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const refreshCache = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/invalidate-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cache cleared! Website will show new settings.");
      }
    } catch {
      toast.error("Failed to clear cache");
    }
  };

  const updateNested = (section: string, key: string, value: any) => {
    if (!config) return;
    setConfig({ ...config, [section]: { ...config[section as keyof AppConfig], [key]: value } });
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 font-semibold text-sm">Loading config...</span>
      </div>
    );
  }

  if (!config) {
    return <div className="py-20 text-center text-zinc-500 font-semibold">Failed to load config</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            <Globe className="w-6 h-6 inline mr-2" />
            Centralized App Config
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Controls all apps — web + Android. Changes take effect immediately (10-min cache).
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { fetchConfig(); refreshCache(); }} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 transition flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh & Clear Cache
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Branding */}
        <div className="border border-zinc-200 rounded-2xl bg-white p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-zinc-800 flex items-center gap-2"><Store className="w-4 h-4 text-emerald-500" /> Branding</h2>
          <div>
            <label className="text-xs font-semibold text-zinc-500">Store Name</label>
            <input type="text" value={config.branding.storeName || ""} onChange={e => updateNested("branding", "storeName", e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">Logo URL</label>
            <input type="text" value={config.branding.logoUrl || ""} onChange={e => updateNested("branding", "logoUrl", e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500">Primary Color</label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={config.branding.primaryColor || "#059669"} onChange={e => updateNested("branding", "primaryColor", e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer" />
                <input type="text" value={config.branding.primaryColor || ""} onChange={e => updateNested("branding", "primaryColor", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Accent Color</label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={config.branding.accentColor || "#0D9488"} onChange={e => updateNested("branding", "accentColor", e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer" />
                <input type="text" value={config.branding.accentColor || ""} onChange={e => updateNested("branding", "accentColor", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">Font</label>
            <input type="text" value={config.branding.font || ""} onChange={e => updateNested("branding", "font", e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" placeholder="e.g., Geist, Inter, system-ui" />
          </div>
        </div>

        {/* Store Settings */}
        <div className="border border-zinc-200 rounded-2xl bg-white p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-zinc-800 flex items-center gap-2"><Settings2 className="w-4 h-4 text-emerald-500" /> Store Settings</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">Store Open</span>
            <button onClick={() => updateNested("store", "isOpen", !config.store.isOpen)}
              className={`w-12 h-6 rounded-full transition-colors ${config.store.isOpen ? "bg-emerald-500" : "bg-zinc-300"} relative`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.store.isOpen ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">Maintenance Mode</span>
            <button onClick={() => updateNested("store", "maintenanceMode", !config.store.maintenanceMode)}
              className={`w-12 h-6 rounded-full transition-colors ${config.store.maintenanceMode ? "bg-red-500" : "bg-zinc-300"} relative`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.store.maintenanceMode ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
          {["minOrderValue", "deliveryCharge", "freeDeliveryAbove", "taxPercent"].map(field => (
            <div key={field}>
              <label className="text-xs font-semibold text-zinc-500">{field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
              <input type="number" value={config.store[field] || ""} onChange={e => updateNested("store", field, parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
            </div>
          ))}

          <div className="border-t border-zinc-100 pt-4 mt-2">
            <h3 className="text-xs font-bold text-zinc-700 mb-3">Shop Location</h3>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Address</label>
              <input type="text" value={config.store.location?.address || ""} onChange={e => updateNested("store", "location", { ...config.store.location, address: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" placeholder="Shop address" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold text-zinc-500">Latitude</label>
                <input type="number" step="any" value={config.store.location?.lat || ""} onChange={e => updateNested("store", "location", { ...config.store.location, lat: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Longitude</label>
                <input type="number" step="any" value={config.store.location?.lng || ""} onChange={e => updateNested("store", "location", { ...config.store.location, lng: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>
            </div>
            <button
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    updateNested("store", "location", {
                      ...config.store.location,
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                    });
                    toast.success("Current location set!");
                  }, () => toast.error("Failed to get location"));
                }
              }}
              className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1"
            >
              📍 Use Current Location
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="border border-zinc-200 rounded-2xl bg-white p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-zinc-800 flex items-center gap-2"><ToggleLeft className="w-4 h-4 text-emerald-500" /> Feature Toggles</h2>
          {["voiceSearch", "wishlist", "coupons", "reviews", "chatbot", "loyalty"].map(feat => (
            <div key={feat} className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-700 capitalize">{feat.replace(/([A-Z])/g, ' $1')}</span>
              <button onClick={() => updateNested("features", feat, !config.features[feat])}
                className={`w-12 h-6 rounded-full transition-colors ${config.features[feat] ? "bg-emerald-500" : "bg-zinc-300"} relative`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.features[feat] ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* SEO + Contact */}
        <div className="space-y-6">
          <div className="border border-zinc-200 rounded-2xl bg-white p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-zinc-800 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" /> SEO</h2>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Meta Title</label>
              <input type="text" value={config.seo?.metaTitle || ""} onChange={e => updateNested("seo", "metaTitle", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Meta Description</label>
              <textarea value={config.seo?.metaDescription || ""} onChange={e => updateNested("seo", "metaDescription", e.target.value)} rows={3}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
            </div>
          </div>
          <div className="border border-zinc-200 rounded-2xl bg-white p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-zinc-800">Contact Info</h2>
            {["phone", "email", "address"].map(field => (
              <div key={field}>
                <label className="text-xs font-semibold text-zinc-500 capitalize">{field}</label>
                <input type={field === "email" ? "email" : "text"} value={config.contact[field] || ""} onChange={e => updateNested("contact", field, e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>
            ))}
          </div>
          <div className="border border-zinc-200 rounded-2xl bg-white p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-zinc-800">AI / Chatbot</h2>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Gemini API Key</label>
              <input type="password" value={config.ai?.geminiApiKey || ""} onChange={e => updateNested("ai", "geminiApiKey", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" placeholder="Enter your Google Gemini API key" />
              <p className="text-[10px] text-zinc-400 mt-1">Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" className="text-emerald-600 hover:underline">aistudio.google.com/apikey</a></p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}