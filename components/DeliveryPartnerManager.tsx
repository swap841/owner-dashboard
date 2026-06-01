"use client";

import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { app } from "../firebaseConfig";
import { getFirestore } from "firebase/firestore";
import {
  Truck, Plus, Edit, Trash, ExternalLink, Loader2, MapPin, Phone, Package,
} from "lucide-react";
import toast from "react-hot-toast";

const db = getFirestore(app);

interface DeliveryPartner {
  id?: string;
  name: string;
  phone: string;
  serviceArea: string;
  charges: number;
  active: boolean;
  notes: string;
}

export default function DeliveryPartnerManager() {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DeliveryPartner | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", serviceArea: "", charges: 0, active: true, notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const snap = await getDocs(query(collection(db, "deliveryPartners"), orderBy("name")));
      setPartners(snap.docs.map(d => ({ id: d.id, ...d.data() } as DeliveryPartner)));
    } catch (err) {
      console.error("Failed to load partners", err);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", serviceArea: "", charges: 0, active: true, notes: "" });
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
      loadPartners();
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
      loadPartners();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-600 to-blue-500 bg-clip-text text-transparent">
            Delivery Partners
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Manage third-party delivery services for extended area orders
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-cyan-500/10">
          <Plus className="w-4 h-4" /> Add Partner
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm">{editing ? "Edit Partner" : "New Partner"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Partner Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input placeholder="Service Area (e.g. Pune, PCMC)" value={form.serviceArea} onChange={e => setForm({...form, serviceArea: e.target.value})} className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input type="number" placeholder="Delivery Charges (₹)" value={form.charges || ""} onChange={e => setForm({...form, charges: Number(e.target.value)})} className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium" />
            <input placeholder="Notes (e.g. delivery time, restrictions)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="px-3 py-2 bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none font-medium col-span-2" />
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

      {loading ? (
        <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
      ) : partners.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50">
          <Truck className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="text-zinc-950 font-bold">No delivery partners</span>
          <p className="text-xs text-zinc-400 mt-1">Add third-party delivery services for out-of-city orders.</p>
        </div>
      ) : (
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
                  {p.notes && <p className="text-zinc-400 italic mt-1">{p.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 px-4 pb-3 border-t border-zinc-100 pt-2">
                <button onClick={() => { setEditing(p); setForm({ name: p.name, phone: p.phone, serviceArea: p.serviceArea, charges: p.charges, active: p.active, notes: p.notes }); setShowForm(true); }} className="p-1.5 border border-zinc-200 hover:border-cyan-500 rounded-lg hover:text-cyan-500 transition"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(p.id!, p.name)} className="p-1.5 border border-zinc-200 hover:border-rose-500 rounded-lg hover:text-rose-500 transition"><Trash className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
