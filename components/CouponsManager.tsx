"use client";

import React, { useState } from "react";
import {
  Ticket, Plus, Edit, Trash, Loader2, Search, X, Save,
} from "lucide-react";
import { useCoupons } from "@/hooks/useCoupons";
import { Coupon } from "@/types";
import toast from "react-hot-toast";

export default function CouponsManager() {
  const { coupons, isLoading, createCoupon, updateCoupon, deleteCoupon } = useCoupons();
  const [modal, setModal] = useState<Coupon | null | "new">(null);
  const [search, setSearch] = useState("");

  const filtered = coupons.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (c: Coupon) => {
    await updateCoupon({ id: c.id!, updates: { active: !c.active } });
    toast.success(`Coupon ${c.active ? "deactivated" : "activated"}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Coupon Management
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Create and manage promotional discount codes
          </p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add Coupon</span>
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by coupon code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-zinc-500 font-semibold text-sm">Loading coupons...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
          <Ticket className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="text-zinc-950 dark:text-white font-bold">No coupons found</span>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
            Create discount coupons to boost your sales.
          </p>
        </div>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-bold">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Min Order</th>
                  <th className="p-3">Max Discount</th>
                  <th className="p-3">Expiry</th>
                  <th className="p-3">Usage</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 font-extrabold text-zinc-900 dark:text-white uppercase">
                      {c.code}
                    </td>
                    <td className="p-3">
                      {c.discountType === "percentage"
                        ? `${c.discountValue}%`
                        : `₹${c.discountValue}`}
                    </td>
                    <td className="p-3">₹{c.minOrderAmount.toFixed(2)}</td>
                    <td className="p-3">
                      {c.maxDiscount ? `₹${c.maxDiscount}` : "—"}
                    </td>
                    <td className="p-3 text-zinc-400 text-[11px]">
                      {c.expiryDate?.seconds
                        ? new Date(c.expiryDate.seconds * 1000).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      {c.usedCount}/{c.usageLimit}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          c.active
                            ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-transparent"
                        }`}
                      >
                        {c.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal(c)}
                          className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 rounded-lg hover:text-emerald-500 transition"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete coupon ${c.code}?`)) {
                              deleteCoupon(c.id!);
                              toast.success("Coupon deleted.");
                            }
                          }}
                          className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 rounded-lg hover:text-rose-500 transition"
                          title="Delete"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <CouponFormModal
          coupon={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            if (modal === "new") {
              await createCoupon(data as Omit<Coupon, "id">);
              toast.success("Coupon created!");
            } else {
              await updateCoupon({ id: (modal as Coupon).id!, updates: data });
              toast.success("Coupon updated!");
            }
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function CouponFormModal({
  coupon,
  onClose,
  onSave,
}: {
  coupon: Coupon | null;
  onClose: () => void;
  onSave: (data: Partial<Coupon>) => Promise<void>;
}) {
  const [code, setCode] = useState(coupon?.code || "");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    coupon?.discountType || "percentage"
  );
  const [discountValue, setDiscountValue] = useState(coupon?.discountValue || 0);
  const [minOrderAmount, setMinOrderAmount] = useState(coupon?.minOrderAmount || 0);
  const [maxDiscount, setMaxDiscount] = useState<number>(coupon?.maxDiscount || 0);
  const [expiryDate, setExpiryDate] = useState(
    coupon?.expiryDate?.seconds
      ? new Date(coupon.expiryDate.seconds * 1000).toISOString().split("T")[0]
      : ""
  );
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit || 100);
  const [usedCount, setUsedCount] = useState(coupon?.usedCount || 0);
  const [active, setActive] = useState(coupon?.active ?? true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return toast.error("Coupon code is required");
    if (discountValue <= 0) return toast.error("Discount value must be > 0");
    if (!expiryDate) return toast.error("Expiry date is required");

    setSubmitting(true);
    try {
      await onSave({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscount: maxDiscount || 0,
        expiryDate: new Date(expiryDate),
        usageLimit,
        usedCount,
        active,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to save coupon");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/85 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
            {coupon ? "Edit Coupon" : "New Coupon"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Code *</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold uppercase"
                placeholder="SUMMER20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-semibold"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                {discountType === "percentage" ? "Discount %" : "Discount Amount (₹)"} *
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                min={1}
                required
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Min Order Amount (₹)</label>
              <input
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Max Discount (₹)</label>
              <input
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Expiry Date *</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Usage Limit</label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Used Count</label>
              <input
                type="number"
                value={usedCount}
                onChange={(e) => setUsedCount(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-zinc-300 dark:bg-zinc-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full" />
            </label>
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Active</span>
          </div>

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
              disabled={submitting}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1.5 disabled:opacity-50 transition"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {coupon ? "Update Coupon" : "Create Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
