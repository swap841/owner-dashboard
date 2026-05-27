"use client";

import React, { useState, useEffect } from "react";
import { DeliveryBoy, SalaryPayment } from "../types";
import { X, Loader2, IndianRupee, Calendar, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSalaryPayments } from "../lib/firestore/salaryPayments";
import SalaryPaymentModal from "./SalaryPaymentModal";
import toast from "react-hot-toast";

interface DeliveryBoyFormProps {
  boy?: DeliveryBoy | null;
  onSave: (dboy: Omit<DeliveryBoy, "id" | "basket">) => Promise<any>;
  onClose: () => void;
}

function formatDate(ts: any): string {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function DeliveryBoyForm({ boy, onSave, onClose }: DeliveryBoyFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [salary, setSalary] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const isEditing = !!boy?.id;

  const paymentsQuery = useQuery<SalaryPayment[], Error>({
    queryKey: ["salaryPayments", "deliveryBoys", boy?.id],
    queryFn: () => getSalaryPayments("deliveryBoys", boy!.id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (boy) {
      setName(boy.name);
      setPhone(boy.phone);
      setActive(boy.active);
      setVehicleNumber(boy.vehicleNumber || "");
      setSalary(boy.salary || 0);
    }
  }, [boy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Delivery boy name is required.");
    if (!phone.trim()) return toast.error("Phone number is required.");
    if (!/^\d{10}$/.test(phone.trim())) return toast.error("Please enter a valid 10-digit phone number.");

    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        vehicleNumber: vehicleNumber.trim(),
        fcmToken: boy?.fcmToken || "",
        active,
        salary,
        joiningDate: boy?.joiningDate || new Date(),
        incrementHistory: boy?.incrementHistory || [],
        holidays: boy?.holidays || [],
        totalEarnings: boy?.totalEarnings || 0,
        breakLogs: boy?.breakLogs || [],
      });
      toast.success(boy ? "Delivery boy updated successfully!" : "Delivery boy created successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save delivery boy profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPaid = (paymentsQuery.data || []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/85 overflow-hidden flex flex-col transition-all max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
            {boy ? "Edit Delivery Boy" : "Add Delivery Boy"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Phone Number (10 digits) *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={10}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              placeholder="e.g. 9876543210"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Vehicle Number
            </label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              placeholder="e.g. MH-01-AB-1234"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Monthly Salary
            </label>
            <div className="relative">
              <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="number"
                value={salary || ""}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                placeholder="e.g. 15000"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dboy-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="dboy-active" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Active Driver
            </label>
          </div>

          {isEditing && (
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/10">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> HR & Salary Details
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <span className="text-zinc-400 font-medium">Joining Date</span>
                <span className="text-zinc-900 dark:text-white font-semibold text-right">{formatDate(boy?.joiningDate)}</span>
                <span className="text-zinc-400 font-medium">Current Salary</span>
                <span className="text-zinc-900 dark:text-white font-semibold text-right">₹{boy?.salary || 0}/mo</span>
                <span className="text-zinc-400 font-medium">Total Earnings</span>
                <span className="text-zinc-900 dark:text-white font-semibold text-right">₹{(boy?.totalEarnings || 0).toLocaleString()}</span>
              </div>
              {boy?.incrementHistory && boy.incrementHistory.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Increments</p>
                  {boy.incrementHistory.map((inc, i) => (
                    <div key={i} className="flex justify-between text-[11px] py-0.5">
                      <span className="text-zinc-500">{formatDate(inc.date)}</span>
                      <span className="text-emerald-600 font-bold">+₹{inc.amount}</span>
                    </div>
                  ))}
                </div>
              )}
              {boy?.holidays && boy.holidays.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Holidays</p>
                  {boy.holidays.map((h, i) => (
                    <div key={i} className="flex justify-between text-[11px] py-0.5">
                      <span className="text-zinc-500">{formatDate(h.date)}</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{h.reason}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Payment History
                </h5>
                {paymentsQuery.isLoading ? (
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                ) : paymentsQuery.data && paymentsQuery.data.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {paymentsQuery.data.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[11px] bg-white dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 border border-zinc-100 dark:border-zinc-700">
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-white">₹{p.amount.toLocaleString()}</span>
                          <span className="text-zinc-400 ml-2">{p.monthYear}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-zinc-500 block">{formatDate(p.paidAt)}</span>
                          <span className="text-[9px] uppercase font-bold text-zinc-400">{p.mode}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">No payments recorded.</p>
                )}
                {paymentsQuery.data && paymentsQuery.data.length > 0 && (
                  <div className="flex justify-between text-xs font-bold mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="text-zinc-500">Total Paid</span>
                    <span className="text-emerald-600">₹{totalPaid.toLocaleString()}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPayModal(true)}
                  className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition"
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Pay Salary
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4.5 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1 disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Driver"
              )}
            </button>
          </div>
        </form>
      </div>

      {showPayModal && boy?.id && (
        <SalaryPaymentModal
          personId={boy.id}
          personName={boy.name}
          salary={boy.salary}
          collection="deliveryBoys"
          onClose={() => setShowPayModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["deliveryBoys"] });
            queryClient.invalidateQueries({ queryKey: ["salaryPayments", "deliveryBoys", boy.id] });
          }}
        />
      )}
    </div>
  );
}
