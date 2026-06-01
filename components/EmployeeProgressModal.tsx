"use client";

import React, { useState, useEffect } from "react";
import {
  X, Loader2, IndianRupee, TrendingUp, Gift, Clock, Plus, ChevronDown, ChevronUp,
} from "lucide-react";
import { collectionGroup, query, where, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { app } from "../firebaseConfig";
import { getFirestore } from "firebase/firestore";
import toast from "react-hot-toast";
import { BonusEntry } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

const db = getFirestore(app);

interface Props {
  employeeId: string;
  name: string;
  phone: string;
  salary: number;
  role: "worker" | "deliveryBoy";
  totalEarnings: number;
  existingBonuses?: BonusEntry[];
  overtimeHours?: number;
  onClose: () => void;
}

export default function EmployeeProgressModal({
  employeeId, name, phone, salary, role, totalEarnings, existingBonuses, overtimeHours, onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [monthlyOrders, setMonthlyOrders] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [showIncrementForm, setShowIncrementForm] = useState(false);
  const [bonusType, setBonusType] = useState<BonusEntry["type"]>("performance");
  const [bonusAmount, setBonusAmount] = useState(0);
  const [bonusReason, setBonusReason] = useState("");
  const [overtimeHrs, setOvertimeHrs] = useState(0);
  const [incrementAmount, setIncrementAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const now = new Date();
  const currentMonth = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  useEffect(() => {
    const fetchMonthlyOrders = async () => {
      try {
        const field = role === "worker" ? "assignedWorkerId" : "assignedDeliveryBoyId";
        const snap = await getDocs(query(
          collectionGroup(db, "orders"),
          where(field, "==", employeeId),
          where("createdAt", ">=", monthStart)
        ));
        setMonthlyOrders(snap.size);
      } catch (err) {
        console.error("Failed to fetch monthly orders", err);
      }
      setLoadingOrders(false);
    };
    fetchMonthlyOrders();
  }, [employeeId, role, monthStart]);

  const collectionName = role === "worker" ? "workers" : "deliveryBoys";
  const emoji = role === "worker" ? "📦" : "🛵";

  const addBonus = async () => {
    if (bonusAmount <= 0 || !bonusReason.trim()) {
      return toast.error("Enter amount and reason");
    }
    setSaving(true);
    try {
      const entry: BonusEntry = {
        type: bonusType, amount: bonusAmount, reason: bonusReason.trim(),
        date: Timestamp.now(), month: currentMonth,
      };
      const ref = doc(db, collectionName, employeeId);
      await updateDoc(ref, {
        bonuses: existingBonuses ? [...existingBonuses, entry] : [entry],
        totalEarnings: (totalEarnings || 0) + bonusAmount,
      });
      toast.success(`₹${bonusAmount} bonus added!`);
      setShowBonusForm(false);
      setBonusAmount(0);
      setBonusReason("");
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add bonus");
    }
    setSaving(false);
  };

  const addOvertime = async () => {
    if (overtimeHrs <= 0) return toast.error("Enter valid hours");
    setSaving(true);
    try {
      const ref = doc(db, collectionName, employeeId);
      await updateDoc(ref, {
        overtimeHours: (overtimeHours || 0) + overtimeHrs,
      });
      toast.success(`${overtimeHrs} overtime hours logged!`);
      setShowOvertimeForm(false);
      setOvertimeHrs(0);
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    } catch (err: any) {
      toast.error(err.message || "Failed to log overtime");
    }
    setSaving(false);
  };

  const addIncrement = async () => {
    if (incrementAmount <= 0) return toast.error("Enter valid increment amount");
    setSaving(true);
    try {
      const ref = doc(db, collectionName, employeeId);
      const snap = await getDocs(collectionGroup(db, "orders"));
      // Not needed - just fetch the worker doc
      const { getDoc } = await import("firebase/firestore");
      const empSnap = await getDoc(ref);
      const empData = empSnap.data() || {};
      const existingIncrements = empData.incrementHistory || [];
      const entry = { date: Timestamp.now(), amount: incrementAmount };

      await updateDoc(ref, {
        salary: (empData.salary || salary) + incrementAmount,
        incrementHistory: [...existingIncrements, entry],
        totalEarnings: (empData.totalEarnings || totalEarnings) + incrementAmount,
      });
      toast.success(`Salary increased by ₹${incrementAmount}!`);
      setShowIncrementForm(false);
      setIncrementAmount(0);
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    } catch (err: any) {
      toast.error(err.message || "Failed to increment salary");
    }
    setSaving(false);
  };

  const allBonuses = existingBonuses || [];
  const totalBonusAmt = allBonuses.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/85 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            {emoji} {name}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-[9px] uppercase tracking-wider font-bold text-emerald-600">This Month</p>
              <p className="text-xl font-black text-emerald-800 mt-1">
                {loadingOrders ? <Loader2 className="w-4 h-4 animate-spin inline" /> : monthlyOrders}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">{role === "worker" ? "Orders Packed" : "Deliveries"}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-[9px] uppercase tracking-wider font-bold text-amber-600">Total Earnings</p>
              <p className="text-xl font-black text-amber-800 mt-1">₹{(totalEarnings || 0).toLocaleString()}</p>
              <p className="text-[10px] text-amber-600 font-medium">Lifetime</p>
            </div>
          </div>

          <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Phone</span>
              <span className="font-semibold text-zinc-800">{phone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Current Salary</span>
              <span className="font-semibold text-zinc-800">₹{salary.toLocaleString()}/mo</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Overtime (Total)</span>
              <span className="font-semibold text-zinc-800">{overtimeHours || 0} hrs</span>
            </div>
            {totalBonusAmt > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total Bonuses</span>
                <span className="font-semibold text-emerald-600">₹{totalBonusAmt.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowBonusForm(!showBonusForm)} className="flex items-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold text-purple-700 transition">
              <Gift className="w-4 h-4" /> {showBonusForm ? "Cancel" : "Add Bonus"}
            </button>
            <button onClick={() => setShowOvertimeForm(!showOvertimeForm)} className="flex items-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 transition">
              <Clock className="w-4 h-4" /> {showOvertimeForm ? "Cancel" : "Add Overtime"}
            </button>
            <button onClick={() => setShowIncrementForm(!showIncrementForm)} className="flex items-center gap-2 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 transition">
              <TrendingUp className="w-4 h-4" /> {showIncrementForm ? "Cancel" : "Increment Salary"}
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition">
              <IndianRupee className="w-4 h-4" /> {showHistory ? "Hide" : "View Bonus History"}
            </button>
          </div>

          {/* Bonus Form */}
          {showBonusForm && (
            <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-purple-800">Add Bonus</h3>
              <select value={bonusType} onChange={e => setBonusType(e.target.value as BonusEntry["type"])} className="w-full px-3 py-2 border border-purple-200 rounded-xl text-xs font-medium bg-white">
                <option value="diwali">Diwali Bonus</option>
                <option value="performance">Performance Bonus</option>
                <option value="overtime">Overtime Pay</option>
                <option value="other">Other</option>
              </select>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="number" placeholder="Amount" value={bonusAmount || ""} onChange={e => setBonusAmount(Number(e.target.value))} className="w-full pl-8 pr-3 py-2 border border-purple-200 rounded-xl text-xs font-medium" />
              </div>
              <input type="text" placeholder="Reason (e.g. Diwali 2026)" value={bonusReason} onChange={e => setBonusReason(e.target.value)} className="w-full px-3 py-2 border border-purple-200 rounded-xl text-xs font-medium" />
              <button onClick={addBonus} disabled={saving} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : `Add ₹${bonusAmount || 0} Bonus`}
              </button>
            </div>
          )}

          {/* Overtime Form */}
          {showOvertimeForm && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-blue-800">Log Overtime Hours</h3>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                <input type="number" placeholder="Hours" value={overtimeHrs || ""} onChange={e => setOvertimeHrs(Number(e.target.value))} className="flex-1 px-3 py-2 border border-blue-200 rounded-xl text-xs font-medium" />
              </div>
              <p className="text-[10px] text-blue-600 font-medium">Total logged: {overtimeHours || 0} hrs</p>
              <button onClick={addOvertime} disabled={saving} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : `Log ${overtimeHrs || 0} Hours`}
              </button>
            </div>
          )}

          {/* Increment Form */}
          {showIncrementForm && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-emerald-800">Salary Increment</h3>
              <p className="text-[10px] text-zinc-500">Current: ₹{salary.toLocaleString()}/mo</p>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="number" placeholder="Increment Amount" value={incrementAmount || ""} onChange={e => setIncrementAmount(Number(e.target.value))} className="w-full pl-8 pr-3 py-2 border border-emerald-200 rounded-xl text-xs font-medium" />
              </div>
              {incrementAmount > 0 && (
                <p className="text-[10px] text-emerald-600 font-bold">New salary: ₹{(salary + incrementAmount).toLocaleString()}/mo</p>
              )}
              <button onClick={addIncrement} disabled={saving} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : `Increase by ₹${incrementAmount || 0}`}
              </button>
            </div>
          )}

          {/* Bonus History */}
          {showHistory && (
            <div className="border border-zinc-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-zinc-700">Bonus & Overtime History</h3>
              {allBonuses.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No bonuses recorded yet</p>
              ) : (
                allBonuses.map((b, i) => (
                  <div key={i} className="flex justify-between items-center bg-zinc-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 capitalize">{b.type}</span>
                      <span className="text-[10px] text-zinc-400 ml-2">{b.reason}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">₹{b.amount}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
