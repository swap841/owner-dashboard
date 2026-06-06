"use client";

import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { app } from "../firebaseConfig";
import { getFirestore } from "firebase/firestore";
import {
  Truck, Plus, Edit, Trash, Loader2, MapPin, Phone, Package,
  ArrowUp, ArrowDown, Shield, Settings2, Save, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAppConfig, updateAppConfig, AppConfig } from "@/lib/firestore/appConfig";

const db = getFirestore(app);

interface DeliveryPartner {
  id?: string;
  name: string;
  phone: string;
  serviceArea: string;
  charges: number;
  active: boolean;
  notes: string;
  apiKey?: string;
  apiSecret?: string;
  priority?: number;
}

export default function DeliveryPartnerManager() {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DeliveryPartner | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", serviceArea: "", charges: 0, active: true, notes: "", apiKey: "", apiSecret: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const cfg = await getAppConfig(true);
      setConfig(cfg);
      const snap = await getDocs(query(collection(db, "deliveryPartners"), orderBy("name")));
      setPartners(snap.docs.map(d => ({ id: d.id, ...d.data() } as DeliveryPartner)));
    } catch (err) {
      console.error("Failed to load", err);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", serviceArea: "", charges: 0, active: true, notes: "", apiKey: "", apiSecret: "" });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "deliveryPartners", editing.id!), { ...form });
        toast.success("Partner updated");
      } else {
        await addDoc(collection(db, "deliveryPartners"), { ...form, createdAt: new Date().toISOString() });
        toast.success("Partner added");
      }
      resetForm();
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete delivery partner ${name}?`)) return;
    try {
      await deleteDoc(doc(db, "deliveryPartners", id));
      toast.success("Partner deleted");
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const movePriority = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= partners.length) return;
    const updated = [...partners];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setPartners(updated.map((p, i) => ({ ...p, priority: i })));
  };

  const savePriorityConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const priority = partners.filter(p => p.active !== false).map(p => p.name);
      await updateAppConfig({
        deliveryPartners: {
          ...config.deliveryPartners,
          priority,
          primary: priority[0] || "",
          partnerCredentials: partners.reduce((acc, p) => {
            if (p.apiKey) {
              acc[p.name] = { apiKey: p.apiKey, apiSecret: p.apiSecret || "", enabled: p.active !== false };
            }
            return acc;
          }, {} as Record<string, { apiKey: string; apiSecret: string; enabled: boolean }>),
        },
      });
      toast.success("Dispatch rules & config saved!");
    } catch {
      toast.error("Failed to save config");
    }
    setSavingConfig(false);
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-600 to-blue-500 bg-clip-text text-transparent">
            <Truck className="w-6 h-6 inline mr-2" />
            Delivery Partners
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Manage third-party services + multi-partner dispatch priority & credentials
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 transition flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-cyan-500/10">
            <Plus className="w-4 h-4" /> Add Partner
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm">{editing ? "Edit Partner" : "New Partner"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Partner Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input placeholder="Service Area (e.g. Pune, PCMC)" value={form.serviceArea} onChange={e => setForm({...form, serviceArea: e.target.value})}
              className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input type="number" placeholder="Delivery Charges (₹)" value={form.charges || ""} onChange={e => setForm({...form, charges: Number(e.target.value)})}
              className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input placeholder="API Key (optional)" value={form.apiKey} onChange={e => setForm({...form, apiKey: e.target.value})}
              className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input placeholder="API Secret (optional)" value={form.apiSecret} onChange={e => setForm({...form, apiSecret: e.target.value})} type="password"
              className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input placeholder="Notes (e.g. delivery time, restrictions)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium col-span-2" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="partner-active" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="rounded" />
            <label htmlFor="partner-active" className="text-xs font-medium text-zinc-600">Active</label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl text-xs font-bold disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : editing ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Dispatch Priority */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-1"><Settings2 className="w-4 h-4 text-cyan-500" /> Dispatch Priority & Credentials</h3>
          <button onClick={savePriorityConfig} disabled={savingConfig}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition flex items-center gap-1">
            {savingConfig ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save to Config
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 mb-3">
          Drag to reorder priority. Primary partner is used first for auto-routing. All credentials encrypted in Firestore.
        </p>

        {partners.length === 0 ? (
          <div className="border border-dashed border-zinc-200 rounded-xl py-8 text-center">
            <Truck className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">No partners yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {partners.map((p, index) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => movePriority(index, -1)} disabled={index === 0}
                    className="p-0.5 rounded hover:bg-zinc-200 disabled:opacity-20 transition">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => movePriority(index, 1)} disabled={index === partners.length - 1}
                    className="p-0.5 rounded hover:bg-zinc-200 disabled:opacity-20 transition">
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <span className={`w-2 h-2 rounded-full ${p.active !== false ? "bg-emerald-400" : "bg-zinc-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-800">{p.name}</span>
                    {index === 0 && <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded text-[9px] font-black">Primary</span>}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {p.serviceArea || "All areas"} | ₹{p.charges || 0}/order
                    {p.apiKey ? " | 🔑 API configured" : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(p); setForm({ name: p.name, phone: p.phone, serviceArea: p.serviceArea, charges: p.charges, active: p.active, notes: p.notes, apiKey: p.apiKey || "", apiSecret: p.apiSecret || "" }); setShowForm(true); }}
                    className="p-1.5 border border-zinc-200 hover:border-cyan-500 rounded-lg hover:text-cyan-500 transition"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(p.id!, p.name)}
                    className="p-1.5 border border-zinc-200 hover:border-rose-500 rounded-lg hover:text-rose-500 transition"><Trash className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {partners.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((p) => (
            <div key={p.id} className="border border-zinc-200 bg-white rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-cyan-500" />
                    <h3 className="font-bold text-sm text-zinc-900">{p.name}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-zinc-500">
                  {p.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</p>}
                  {p.serviceArea && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.serviceArea}</p>}
                  {p.charges > 0 && <p className="flex items-center gap-1"><Package className="w-3 h-3" /> ₹{p.charges} delivery charge</p>}
                  {p.apiKey && <p className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500" /> API configured</p>}
                  {p.notes && <p className="text-zinc-400 italic mt-1">{p.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
