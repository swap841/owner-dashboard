"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Plus, Trash, MapPin, Save, RefreshCw, ToggleLeft } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "@/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getAppConfig, updateAppConfig, AppConfig } from "@/lib/firestore/appConfig";

export default function DeliveryZoneManager() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPincode, setNewPincode] = useState("");
  const [newCharge, setNewCharge] = useState(0);
  const [newThreshold, setNewThreshold] = useState(0);
  const [newHours, setNewHours] = useState(0);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getAppConfig(true);
      setConfig(cfg);
    } catch { toast.error("Failed to load config"); }
    setLoading(false);
  };

  const addPincode = () => {
    if (!config || !newPincode.trim()) return;
    const pincode = newPincode.trim();
    if (config.deliveryZones.localPincodes.includes(pincode)) {
      return toast.error("Pincode already added");
    }
    setConfig({
      ...config,
      deliveryZones: {
        ...config.deliveryZones,
        localPincodes: [...config.deliveryZones.localPincodes, pincode],
        deliveryCharges: { ...config.deliveryZones.deliveryCharges, [pincode]: newCharge },
        freeDeliveryThresholds: { ...config.deliveryZones.freeDeliveryThresholds, [pincode]: newThreshold },
        estimatedDeliveryHours: { ...config.deliveryZones.estimatedDeliveryHours, [pincode]: newHours },
      },
    });
    setNewPincode("");
    setNewCharge(0);
    setNewThreshold(0);
    setNewHours(0);
  };

  const removePincode = (pincode: string) => {
    if (!config) return;
    const { [pincode]: _, ...restCharges } = config.deliveryZones.deliveryCharges;
    const { [pincode]: _2, ...restThresholds } = config.deliveryZones.freeDeliveryThresholds;
    const { [pincode]: _3, ...restHours } = config.deliveryZones.estimatedDeliveryHours;
    setConfig({
      ...config,
      deliveryZones: {
        ...config.deliveryZones,
        localPincodes: config.deliveryZones.localPincodes.filter(p => p !== pincode),
        deliveryCharges: restCharges,
        freeDeliveryThresholds: restThresholds,
        estimatedDeliveryHours: restHours,
      },
    });
  };

  const updateCharge = (pincode: string, charge: number) => {
    if (!config) return;
    setConfig({
      ...config,
      deliveryZones: {
        ...config.deliveryZones,
        deliveryCharges: { ...config.deliveryZones.deliveryCharges, [pincode]: charge },
      },
    });
  };

  const updateThreshold = (pincode: string, threshold: number) => {
    if (!config) return;
    setConfig({
      ...config,
      deliveryZones: {
        ...config.deliveryZones,
        freeDeliveryThresholds: { ...config.deliveryZones.freeDeliveryThresholds, [pincode]: threshold },
      },
    });
  };

  const updateHours = (pincode: string, hours: number) => {
    if (!config) return;
    setConfig({
      ...config,
      deliveryZones: {
        ...config.deliveryZones,
        estimatedDeliveryHours: { ...config.deliveryZones.estimatedDeliveryHours, [pincode]: hours },
      },
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await updateAppConfig({ deliveryZones: config.deliveryZones });
      toast.success("Delivery zones saved! Server cache will refresh.");
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  const clearAll = () => {
    if (!config || !confirm("Clear all delivery zones?")) return;
    setConfig({
      ...config,
      deliveryZones: {
        ...config.deliveryZones,
        localPincodes: [],
        deliveryCharges: {},
        freeDeliveryThresholds: {},
        estimatedDeliveryHours: {},
      },
    });
  };

  const handleBulkPaste = () => {
    const text = prompt("Paste pincodes separated by comma, space, or newline:");
    if (!text || !config) return;
    const pincodes = text.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    const existing = new Set(config.deliveryZones.localPincodes);
    const newPincodes = pincodes.filter(p => !existing.has(p));
    const updatedCharges = { ...config.deliveryZones.deliveryCharges };
    const updatedThresholds = { ...config.deliveryZones.freeDeliveryThresholds };
    const updatedHours = { ...config.deliveryZones.estimatedDeliveryHours };
    newPincodes.forEach(p => {
      if (!updatedCharges[p]) updatedCharges[p] = 0;
      if (!updatedThresholds[p]) updatedThresholds[p] = 0;
      if (!updatedHours[p]) updatedHours[p] = 24;
    });
    setConfig({
      ...config,
      deliveryZones: {
        ...config.deliveryZones,
        localPincodes: [...config.deliveryZones.localPincodes, ...newPincodes],
        deliveryCharges: updatedCharges,
        freeDeliveryThresholds: updatedThresholds,
        estimatedDeliveryHours: updatedHours,
      },
    });
    toast.success(`Added ${newPincodes.length} pincodes`);
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  if (!config) {
    return <div className="py-20 text-center text-zinc-500 font-semibold">Failed to load config</div>;
  }

  const zones = config.deliveryZones;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            <MapPin className="w-6 h-6 inline mr-2" />
            Delivery Zones
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Manage pincode-based delivery zones with dynamic charges & thresholds
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadConfig} className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 transition flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Zones
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600">Delivery Zones Enabled</span>
          <button onClick={() => setConfig({ ...config, deliveryZones: { ...zones, enabled: !zones.enabled } })}
            className={`w-12 h-6 rounded-full transition-colors ${zones.enabled ? "bg-emerald-500" : "bg-zinc-300"} relative`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${zones.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600">Out-of-City Handling</span>
          <select value={zones.outOfCityHandling} onChange={e => setConfig({ ...config, deliveryZones: { ...zones, outOfCityHandling: e.target.value as any } })}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none">
            <option value="manual">Manual Review</option>
            <option value="partner">Auto-route to Partner</option>
            <option value="disable">Disable Out-of-City Orders</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-500 mr-1">Max Weight (kg)</label>
          <input type="number" value={zones.maxLocalWeightKg} onChange={e => setConfig({ ...config, deliveryZones: { ...zones, maxLocalWeightKg: Number(e.target.value) || 10 } })}
            className="w-20 px-2 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none" />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-800 mb-4">Add Pincode</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-zinc-500">Pincode</label>
            <input type="text" value={newPincode} onChange={e => setNewPincode(e.target.value)}
              className="w-28 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="e.g. 411001" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">Delivery Charge (₹)</label>
            <input type="number" value={newCharge} onChange={e => setNewCharge(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">Free Above (₹)</label>
            <input type="number" value={newThreshold} onChange={e => setNewThreshold(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">Est. Hours</label>
            <input type="number" value={newHours} onChange={e => setNewHours(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
          </div>
          <button onClick={addPincode} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add
          </button>
          <button onClick={handleBulkPaste} className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-50 transition">
            Bulk Paste
          </button>
          <button onClick={clearAll} className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition">
            Clear All
          </button>
        </div>
      </div>

      {zones.localPincodes.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-2xl py-16 flex flex-col items-center justify-center bg-white/50">
          <MapPin className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="font-bold text-zinc-700">No delivery zones configured</span>
          <p className="text-xs text-zinc-400 mt-1">Add pincodes above to define your delivery area.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
              <tr>
                <th className="p-3">Pincode</th>
                <th className="p-3">Delivery Charge (₹)</th>
                <th className="p-3">Free Delivery Above (₹)</th>
                <th className="p-3">Est. Delivery (hours)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {zones.localPincodes.map(pincode => (
                <tr key={pincode} className="hover:bg-zinc-50/50">
                  <td className="p-3 font-bold text-zinc-900">{pincode}</td>
                  <td className="p-3">
                    <input type="number" value={zones.deliveryCharges[pincode] || 0}
                      onChange={e => updateCharge(pincode, Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded-lg border border-zinc-200 text-xs font-semibold focus:outline-none" />
                  </td>
                  <td className="p-3">
                    <input type="number" value={zones.freeDeliveryThresholds[pincode] || 0}
                      onChange={e => updateThreshold(pincode, Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded-lg border border-zinc-200 text-xs font-semibold focus:outline-none" />
                  </td>
                  <td className="p-3">
                    <input type="number" value={zones.estimatedDeliveryHours[pincode] || 0}
                      onChange={e => updateHours(pincode, Number(e.target.value))}
                      className="w-20 px-2 py-1 rounded-lg border border-zinc-200 text-xs font-semibold focus:outline-none" />
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => removePincode(pincode)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 border-t border-zinc-100 bg-zinc-50/50 text-xs text-zinc-500 font-medium text-right">
            {zones.localPincodes.length} pincode{zones.localPincodes.length !== 1 ? "s" : ""} configured
          </div>
        </div>
      )}
    </div>
  );
}
