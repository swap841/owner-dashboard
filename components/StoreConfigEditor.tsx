"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Loader2, Save, Globe, Store, Settings2, ToggleLeft, Shield, RefreshCw,
  MapPin, CreditCard, Users, Bell, Key, Building2, LayoutGrid, Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAppConfig, updateAppConfig, clearAppConfigCache, AppConfig } from "@/lib/firestore/appConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebaseConfig";

type ConfigTab = "general" | "branding" | "store" | "delivery" | "payment" | "workers" | "notifications" | "features" | "seo" | "categories" | "about";

interface TabConfig {
  id: ConfigTab;
  label: string;
  icon: any;
}

const TABS: TabConfig[] = [
  { id: "general", label: "General", icon: Building2 },
  { id: "branding", label: "Branding", icon: Globe },
  { id: "about", label: "About Us", icon: Info },
  { id: "store", label: "Store Settings", icon: Store },
  { id: "delivery", label: "Delivery Zones", icon: MapPin },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "workers", label: "Workers", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "features", label: "Features", icon: ToggleLeft },
  { id: "seo", label: "SEO & Contact", icon: Shield },
];

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "https://grocery-server-10ct.onrender.com";

export default function StoreConfigEditor() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [aboutUs, setAboutUs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>("general");
  const [newPincode, setNewPincode] = useState("");
  const [newPincodeCharge, setNewPincodeCharge] = useState(0);
  const [newWorkerEmail, setNewWorkerEmail] = useState("");
  const [newDeliveryBoyEmail, setNewDeliveryBoyEmail] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetchConfig();
    }
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getAppConfig(true);
      setConfig(cfg);
    } catch (err) {
      toast.error("Failed to fetch config");
    }
    // Load aboutUs from appConfig/settings
    try {
      const { getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "appConfig", "settings"));
      if (snap.exists() && snap.data().aboutUs) {
        setAboutUs(snap.data().aboutUs);
      }
    } catch {}
    setLoading(false);
  };

  const update = (section: keyof AppConfig, key: string, value: any) => {
    if (!config) return;
    setConfig(prev => ({
      ...prev!,
      [section]: { ...(prev![section] as any), [key]: value },
    }));
  };

  const updateNested = (section: keyof AppConfig, sub: string, key: string, value: any) => {
    if (!config) return;
    setConfig(prev => ({
      ...prev!,
      [section]: {
        ...(prev![section] as any),
        [sub]: { ...(prev![section] as any)?.[sub], [key]: value },
      },
    }));
  };

  const addPincode = () => {
    if (!config || !newPincode.trim()) return;
    const p = newPincode.trim();
    if (config.deliveryZones.localPincodes.includes(p)) {
      return toast.error("Pincode already exists");
    }
    setConfig({
      ...config,
      deliveryZones: {
        ...config.deliveryZones,
        localPincodes: [...config.deliveryZones.localPincodes, p],
        deliveryCharges: { ...config.deliveryZones.deliveryCharges, [p]: newPincodeCharge },
      },
    });
    setNewPincode("");
    setNewPincodeCharge(0);
  };

  const removePincode = (pincode: string) => {
    if (!config) return;
    const { [pincode]: _, ...rest } = config.deliveryZones.deliveryCharges;
    setConfig({
      ...config,
      deliveryZones: {
        ...config.deliveryZones,
        localPincodes: config.deliveryZones.localPincodes.filter(p => p !== pincode),
        deliveryCharges: rest,
      },
    });
  };

  const addWorkerEmail = () => {
    if (!config || !newWorkerEmail.trim()) return;
    const email = newWorkerEmail.trim().toLowerCase();
    if (config.workers.workerEmails.includes(email)) return toast.error("Email already exists");
    setConfig({
      ...config,
      workers: { ...config.workers, workerEmails: [...config.workers.workerEmails, email] },
    });
    setNewWorkerEmail("");
  };

  const removeWorkerEmail = (index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      workers: { ...config.workers, workerEmails: config.workers.workerEmails.filter((_, i) => i !== index) },
    });
  };

  const addDeliveryBoyEmail = () => {
    if (!config || !newDeliveryBoyEmail.trim()) return;
    const email = newDeliveryBoyEmail.trim().toLowerCase();
    if (config.workers.deliveryBoyEmails.includes(email)) return toast.error("Email already exists");
    setConfig({
      ...config,
      workers: { ...config.workers, deliveryBoyEmails: [...config.workers.deliveryBoyEmails, email] },
    });
    setNewDeliveryBoyEmail("");
  };

  const removeDeliveryBoyEmail = (index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      workers: { ...config.workers, deliveryBoyEmails: config.workers.deliveryBoyEmails.filter((_, i) => i !== index) },
    });
  };

  const saveAboutUs = async () => {
    try {
      await setDoc(doc(db, "appConfig", "settings"), { aboutUs, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error("Failed to save aboutUs", err);
      throw err;
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await updateAppConfig(config);
      await saveAboutUs();
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      await fetch(`${SERVER_URL}/api/invalidate-cache`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => {});
      toast.success("Config saved! Server & CDN caches cleared.");
    } catch {
      toast.error("Failed to save config");
    }
    setSaving(false);
  };

  const handleRefresh = async () => {
    clearAppConfigCache();
    await fetchConfig();
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    await fetch(`${SERVER_URL}/api/invalidate-cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(() => {});
    toast.success("Config refreshed & cache cleared");
  };

  const toggle = (section: keyof AppConfig, key: string) => update(section, key, !(config as any)?.[section]?.[key]);

  const renderToggle = (label: string, section: keyof AppConfig, key: string, enabledColor = "bg-emerald-500") => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-semibold text-zinc-700">{label}</span>
      <button onClick={() => toggle(section, key)}
        className={`w-12 h-6 rounded-full transition-colors ${(config as any)?.[section]?.[key] ? enabledColor : "bg-zinc-300"} relative`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${(config as any)?.[section]?.[key] ? "translate-x-6" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  const renderInput = (label: string, section: keyof AppConfig, key: string, type = "text", opts?: any) => (
    <div>
      <label className="text-xs font-semibold text-zinc-500">{label}</label>
      {type === "select" ? (
        <select value={(config as any)?.[section]?.[key] || ""} onChange={e => update(section, key, e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
          {opts?.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={(config as any)?.[section]?.[key] || ""}
          onChange={e => update(section, key, type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" {...opts} />
      )}
    </div>
  );

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  if (!config) {
    return <div className="py-20 text-center text-zinc-500 font-semibold">Failed to load config</div>;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-800">Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInput("Store Name", "business", "name")}
              <div>
                <label className="text-xs font-semibold text-zinc-500">Business Type</label>
                <select value={config.business.type} onChange={e => update("business", "type", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none">
                  {["grocery", "restaurant", "pharmacy", "electronics", "clothing", "general"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Currency</label>
                <select value={config.business.currency} onChange={e => update("business", "currency", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              {renderInput("Currency Symbol", "business", "currencySymbol")}
              {renderInput("Tax Rate (%)", "business", "taxRate", "number")}
              {renderInput("Tax Name (e.g. GST, VAT)", "business", "taxName")}
              {renderInput("Order Prefix", "business", "orderPrefix")}
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Invoice Footer Text</label>
              <textarea value={config.business.invoiceFooter} onChange={e => update("business", "invoiceFooter", e.target.value)} rows={2}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-800">About Us Page</h2>
            <p className="text-xs text-zinc-500">This content appears on the Customer Website /about page and the Customer Android About screen.</p>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Story</label>
              <textarea value={aboutUs.story || ""} onChange={e => setAboutUs((prev: any) => ({ ...prev, story: e.target.value }))} rows={4}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="The story of your store..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Mission</label>
              <textarea value={aboutUs.mission || ""} onChange={e => setAboutUs((prev: any) => ({ ...prev, mission: e.target.value }))} rows={2}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Your mission statement..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Vision</label>
              <textarea value={aboutUs.vision || ""} onChange={e => setAboutUs((prev: any) => ({ ...prev, vision: e.target.value }))} rows={2}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Your vision statement..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500">Founding Date</label>
                <input type="date" value={aboutUs.foundingDate || ""} onChange={e => setAboutUs((prev: any) => ({ ...prev, foundingDate: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Team Size</label>
                <input type="number" value={aboutUs.teamSize || ""} onChange={e => setAboutUs((prev: any) => ({ ...prev, teamSize: parseInt(e.target.value) || 0 }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500">Achievements (one per line)</label>
              <textarea value={(aboutUs.achievements || []).join("\n")}
                onChange={e => setAboutUs((prev: any) => ({ ...prev, achievements: e.target.value.split("\n").filter((a: string) => a.trim()) }))} rows={4}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Best Local Store 2023&#10;Fast Delivery Award 2024" />
            </div>
          </div>
        );

      case "branding":
        return (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-800">Branding</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInput("Logo URL", "business", "logoUrl")}
              {renderInput("Favicon URL", "business", "faviconUrl")}
              {renderInput("Font Family", "business", "font", "text", { placeholder: "e.g., Inter, system-ui" })}
              <div>
                <label className="text-xs font-semibold text-zinc-500">Primary Color</label>
                <div className="flex gap-2 mt-1">
                  <input type="color" value={config.business.primaryColor}
                    onChange={e => update("business", "primaryColor", e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer" />
                  <input type="text" value={config.business.primaryColor}
                    onChange={e => update("business", "primaryColor", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Accent Color</label>
                <div className="flex gap-2 mt-1">
                  <input type="color" value={config.business.accentColor}
                    onChange={e => update("business", "accentColor", e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer" />
                  <input type="text" value={config.business.accentColor}
                    onChange={e => update("business", "accentColor", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
                </div>
              </div>
            </div>
            {config.business.logoUrl && (
              <div className="p-4 bg-zinc-50 rounded-xl flex items-center gap-3">
                <img src={config.business.logoUrl} alt="Preview" className="w-12 h-12 object-contain rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="text-xs text-zinc-500">
                  <p className="font-bold text-zinc-700">{config.business.name || "Store Name"}</p>
                  <p>Preview of logo + branding</p>
                </div>
              </div>
            )}
          </div>
        );

      case "store":
        return (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-800">Store Settings</h2>
            {renderToggle("Store Open", "store", "isOpen")}
            {renderToggle("Maintenance Mode", "store", "maintenanceMode", "bg-red-500")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInput("Minimum Order Value (₹)", "store", "minOrderValue", "number")}
              {renderInput("Standard Delivery Charge (₹)", "store", "deliveryCharge", "number")}
              {renderInput("Free Delivery Above (₹)", "store", "freeDeliveryAbove", "number")}
              {renderInput("Tax Percent (%)", "store", "taxPercent", "number")}
            </div>
            <div className="border-t border-zinc-100 pt-4">
              <h3 className="text-xs font-bold text-zinc-700 mb-3">Shop Location</h3>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Address</label>
                <input type="text" value={config.store.location?.address || ""}
                  onChange={e => updateNested("store", "location", "address", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" placeholder="Shop address" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500">Latitude</label>
                  <input type="number" step="any" value={config.store.location?.lat || 0}
                    onChange={e => updateNested("store", "location", "lat", parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500">Longitude</label>
                  <input type="number" step="any" value={config.store.location?.lng || 0}
                    onChange={e => updateNested("store", "location", "lng", parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
                </div>
              </div>
              <button onClick={() => {
                if (typeof navigator !== "undefined" && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => { updateNested("store", "location", "lat", pos.coords.latitude); updateNested("store", "location", "lng", pos.coords.longitude); toast.success("Current location set!"); },
                    () => toast.error("Failed to get location"),
                  );
                }
              }} className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition">
                📍 Use Current Location
              </button>
            </div>
          </div>
        );

      case "delivery":
        return (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-800">Delivery Zones</h2>
            {renderToggle("Enable Delivery Zones", "deliveryZones", "enabled")}
            <div>
              <label className="text-xs font-semibold text-zinc-500">Out-of-City Handling</label>
              <select value={config.deliveryZones.outOfCityHandling}
                onChange={e => update("deliveryZones", "outOfCityHandling", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none">
                <option value="manual">Manual Review</option>
                <option value="partner">Auto-route to Partner</option>
                <option value="disable">Disable</option>
              </select>
            </div>
            {renderInput("Max Local Weight (kg)", "deliveryZones", "maxLocalWeightKg", "number")}
            <div className="border-t border-zinc-100 pt-4">
              <h3 className="text-xs font-bold text-zinc-700 mb-3">Pincodes</h3>
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-xs font-semibold text-zinc-500">Pincode</label>
                  <input type="text" value={newPincode} onChange={e => setNewPincode(e.target.value)}
                    className="w-28 mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" placeholder="411001" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500">Charge (₹)</label>
                  <input type="number" value={newPincodeCharge} onChange={e => setNewPincodeCharge(Number(e.target.value))}
                    className="w-24 mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
                </div>
                <button onClick={addPincode} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition">Add</button>
              </div>
              {config.deliveryZones.localPincodes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {config.deliveryZones.localPincodes.map(p => (
                    <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold">
                      {p} (₹{config.deliveryZones.deliveryCharges[p] || 0})
                      <button onClick={() => removePincode(p)} className="hover:text-red-500 ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "payment":
        return (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-800">Payment Settings</h2>
            {renderToggle("Cash on Delivery", "payment", "codEnabled")}
            {renderToggle("Razorpay (Cards/UPI)", "payment", "razorpayEnabled")}
            {config.payment.razorpayEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-xl">
                {renderInput("Razorpay Key ID", "payment", "razorpayKeyId")}
                {renderInput("Razorpay Key Secret", "payment", "razorpayKeySecret", "password")}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInput("Auto-cancel unpaid (min)", "payment", "autoCancelUnpaidMinutes", "number")}
              {renderInput("Payment reminder (hrs)", "payment", "paymentReminderHours", "number")}
            </div>
          </div>
        );

      case "workers":
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-zinc-800">Worker Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInput("Daily Wage (₹)", "workers", "wagesDaily", "number")}
                {renderInput("Hourly Wage (₹)", "workers", "wagesHourly", "number")}
              </div>
              {renderToggle("Enable Clock In/Out", "workers", "enableClockInOut")}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[10px] text-amber-700 font-medium">
                  Worker PINs are managed from the Workers page. Each worker has a 4-digit PIN for clock in/out.
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-3">
              <h3 className="text-sm font-bold text-zinc-800">Worker Email Access</h3>
              <p className="text-[10px] text-zinc-500">Emails that can sign in to the Worker Android app.</p>
              <div className="flex gap-2">
                <input type="email" value={newWorkerEmail} onChange={e => setNewWorkerEmail(e.target.value)}
                  placeholder="worker@example.com"
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                <button onClick={addWorkerEmail} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition">
                  Add
                </button>
              </div>
              {config.workers.workerEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.workers.workerEmails.map((email, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                      {email}
                      <button onClick={() => removeWorkerEmail(i)} className="hover:text-red-500 ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-3">
              <h3 className="text-sm font-bold text-zinc-800">Delivery Boy Email Access</h3>
              <p className="text-[10px] text-zinc-500">Emails that can sign in to the Delivery Boy Android app.</p>
              <div className="flex gap-2">
                <input type="email" value={newDeliveryBoyEmail} onChange={e => setNewDeliveryBoyEmail(e.target.value)}
                  placeholder="delivery@example.com"
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                <button onClick={addDeliveryBoyEmail} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition">
                  Add
                </button>
              </div>
              {config.workers.deliveryBoyEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.workers.deliveryBoyEmails.map((email, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                      {email}
                      <button onClick={() => removeDeliveryBoyEmail(i)} className="hover:text-red-500 ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-800">Notification Settings</h2>
            <div>
              <label className="text-xs font-semibold text-zinc-500">SMS Provider</label>
              <select value={config.notifications.smsProvider}
                onChange={e => update("notifications", "smsProvider", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none">
                <option value="">None</option>
                <option value="twilio">Twilio</option>
                <option value="msg91">MSG91</option>
                <option value="textlocal">TextLocal</option>
                <option value="custom">Custom API</option>
              </select>
            </div>
            {renderInput("SMS API Key", "notifications", "smsApiKey", "password")}
            {renderInput("WhatsApp API Key", "notifications", "whatsAppApiKey", "password")}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] text-blue-700 font-medium">
                Notification templates (SMS/WhatsApp) can use variables: {"{orderId}"}, {"{amount}"}, {"{name}"}, {"{status}"}
              </p>
            </div>
          </div>
        );

      case "features":
        return (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-zinc-800">Feature Toggles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(config.features).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                  <span className="text-sm font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <button onClick={() => update("features", key, !val)}
                    className={`w-12 h-6 rounded-full transition-colors ${val ? "bg-emerald-500" : "bg-zinc-300"} relative`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${val ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case "seo":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-zinc-800 mb-4">SEO</h2>
              {renderInput("Meta Title", "seo", "metaTitle")}
              <div className="mt-3">
                <label className="text-xs font-semibold text-zinc-500">Meta Description</label>
                <textarea value={config.seo.metaDescription} onChange={e => update("seo", "metaDescription", e.target.value)} rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
            </div>
            <div className="border-t border-zinc-100 pt-4">
              <h2 className="text-sm font-bold text-zinc-800 mb-4">Contact Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInput("Phone", "contact", "phone")}
                {renderInput("Email", "contact", "email", "email")}
              </div>
              {renderInput("Address", "contact", "address")}
            </div>
            <div className="border-t border-zinc-100 pt-4">
              <h2 className="text-sm font-bold text-zinc-800 mb-4">AI / Chatbot</h2>
              {renderInput("Gemini API Key", "ai", "geminiApiKey", "password")}
              <p className="text-[10px] text-zinc-400 mt-1">Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" className="text-emerald-600 hover:underline">aistudio.google.com/apikey</a></p>
            </div>
          </div>
        );

    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            <Settings2 className="w-6 h-6 inline mr-2" />
            Store Configuration
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Everything is stored in Firestore — changes take effect without redeployment
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 transition flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-1 pb-1 scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border
              ${isActive
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-sm"
                : "text-zinc-500 border-transparent hover:bg-zinc-100 hover:text-zinc-700"}`}>
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-500" : "text-zinc-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm min-h-[300px]">
        {renderTabContent()}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          Server auto-refreshes config every 60 minutes. Use "Refresh" to force immediate cache clear.
          API keys for Razorpay, SMS, WhatsApp, and delivery partners are stored encrypted in Firestore.
        </p>
      </div>
    </div>
  );
}
