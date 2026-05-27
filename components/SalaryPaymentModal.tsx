"use client";

import React, { useState } from "react";
import { X, Loader2, IndianRupee } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { paySalary } from "@/lib/firestore/salaryPayments";

function getPastMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

interface SalaryPaymentModalProps {
  personId: string;
  personName: string;
  salary: number;
  collection: "workers" | "deliveryBoys";
  onClose: () => void;
  onSuccess: () => void;
}

export default function SalaryPaymentModal({
  personId,
  personName,
  salary,
  collection,
  onClose,
  onSuccess,
}: SalaryPaymentModalProps) {
  const [amount, setAmount] = useState(salary);
  const [monthYear, setMonthYear] = useState("");
  const [mode, setMode] = useState("cash");
  const [saving, setSaving] = useState(false);

  const pastMonths = getPastMonthOptions();

  const handleSubmit = async () => {
    if (!monthYear || amount <= 0) return;
    setSaving(true);
    try {
      await paySalary(collection, personId, {
        amount,
        monthYear,
        paidAt: Timestamp.now(),
        mode,
      });
      onSuccess();
      onClose();
    } catch {
      alert("Failed to process salary payment.");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/85 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">Pay Salary</h2>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold text-zinc-500">
            Paying: <span className="text-zinc-900 dark:text-white">{personName}</span>
          </p>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Amount</label>
            <div className="relative">
              <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Month/Year</label>
            <select
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="">Select month</option>
              {pastMonths.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="cash">Cash</option>
              <option value="bank transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !monthYear || amount <= 0}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1 disabled:opacity-50 transition"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Pay ₹{amount.toLocaleString()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
