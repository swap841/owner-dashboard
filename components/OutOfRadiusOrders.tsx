"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Truck, MapPin, Package, Phone, User, IndianRupee, RefreshCw, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { collectionGroup, getDocs, query, where, doc, updateDoc, getDoc, collection } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getAppConfig, AppConfig } from "@/lib/firestore/appConfig";
import { Order } from "@/types";

export default function OutOfRadiusOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [partnerSelections, setPartnerSelections] = useState<Record<string, string>>({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const cfg = await getAppConfig(true);
      setConfig(cfg);

      const partnerSnap = await getDocs(collection(db, "deliveryPartners"));
      setPartners(partnerSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const statuses = ["Ready to Dispatch", "Packing", "Pending"];
      const result: Order[] = [];
      for (const status of statuses) {
        const q = query(collectionGroup(db, "orders"), where("status", "==", status));
        const snap = await getDocs(q);
        snap.forEach(d => {
          const data = d.data();
          const ref = d.ref;
          const parts = ref.path.split("/");
          const userId = parts[1];
          result.push({
            id: d.id,
            userId,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
          } as Order);
        });
      }

      const localPincodes = cfg.deliveryZones?.localPincodes || [];
      const outOfRadius = result.filter(order => {
        const pincode = order.address?.pincode || "";
        if (!pincode) return true;
        return !localPincodes.includes(pincode);
      });

      setOrders(outOfRadius);
    } catch (err) {
      console.error("Failed to load out-of-radius orders", err);
      toast.error("Failed to load orders");
    }
    setLoading(false);
  };

  const getRelevantPincode = (order: Order): string => {
    return order.address?.pincode || "";
  };

  const dispatchToPartner = async (order: Order) => {
    if (!order.id) return toast.error("Invalid order");
    const partnerId = partnerSelections[order.id];
    if (!partnerId) return toast.error("Select a delivery partner first");
    setDispatchingId(order.id);
    try {
      const partner = partners.find(p => p.id === partnerId);
      const orderRef = doc(db, "users", order.userId, "orders", order.id);
      await updateDoc(orderRef, {
        status: "Dispatched",
        dispatchedAt: new Date().toISOString(),
        deliveryPartner: { id: partnerId, name: partner?.name || "Partner" },
        outOfRadius: true,
      });
      toast.success(`Order dispatched via ${partner?.name || "partner"}`);
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch");
    }
    setDispatchingId(null);
  };

  const selectPartner = (orderId: string, partnerId: string) => {
    if (!orderId) return;
    setPartnerSelections(prev => ({ ...prev, [orderId]: partnerId }));
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-600 to-blue-500 bg-clip-text text-transparent">
            <Truck className="w-6 h-6 inline mr-2" />
            Out of Radius Orders
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Orders from areas outside your local delivery zones — route to partners
          </p>
        </div>
        <button onClick={loadAll} className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 transition flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-emerald-600" />
        <div>
          <p className="text-xs font-bold text-emerald-800">Local Zones</p>
          <p className="text-[10px] text-emerald-600">
            {config?.deliveryZones?.localPincodes?.length || 0} pincodes configured
            {config?.deliveryZones?.enabled ? " (enabled)" : " (disabled)"}
          </p>
        </div>
        <span className="ml-auto text-xs font-bold text-emerald-700">{orders.length} out-of-radius</span>
      </div>

      {orders.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-2xl py-16 flex flex-col items-center justify-center bg-white/50">
          <Package className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="font-bold text-zinc-700">No out-of-radius orders</span>
          <p className="text-xs text-zinc-400 mt-1">All pending orders are within your local delivery zones.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const pincode = getRelevantPincode(order);
            return (
              <div key={order.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">
                      #{order.id?.substring(0, 8)} | {order.userId?.substring(0, 8)}...
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                  <div className="flex items-center gap-1 text-zinc-500">
                    <User className="w-3 h-3" />
                    <span>{order.address?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Phone className="w-3 h-3" />
                    <span>{order.address?.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span className="font-bold text-rose-600">PIN: {pincode || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <IndianRupee className="w-3 h-3" />
                    <span className="font-bold">₹{order.totalAmount?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 mb-3">
                  {order.address?.addressLine || ""}
                  {order.address?.city ? `, ${order.address.city}` : ""}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
                  <select value={partnerSelections[order.id || ""] || ""} onChange={e => selectPartner(order.id || "", e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none">
                    <option value="">Select delivery partner...</option>
                    {partners.filter(p => p.active !== false).map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.charges ? `(₹${p.charges})` : ""}</option>
                    ))}
                  </select>
                  <button onClick={() => dispatchToPartner(order)} disabled={dispatchingId === order.id || !partnerSelections[order.id || ""]}
                    className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition flex items-center gap-1">
                    {dispatchingId === (order.id || "") ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
                    Dispatch
                  </button>
                </div>

                {order.address?.pincode && config?.deliveryZones?.deliveryCharges && (
                  <div className="mt-2 text-[10px] text-zinc-400">
                    Est. partner charge: ₹{config.deliveryZones.deliveryCharges[pincode] || "varies"}
                    {config.deliveryZones.estimatedDeliveryHours?.[pincode] ? ` | Est. delivery: ${config.deliveryZones.estimatedDeliveryHours[pincode]}h` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
