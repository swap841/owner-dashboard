"use client";

import React, { useState } from "react";
import { Loader2, Plus, Edit, Trash, Users, IndianRupee, UserCheck, ChevronDown, ChevronUp, Calendar, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkers } from "@/hooks/useWorkers";
import { Worker, SalaryPayment } from "@/types";
import { getSalaryPayments } from "@/lib/firestore/salaryPayments";
import SalaryPaymentModal from "./SalaryPaymentModal";

function formatDate(ts: any): string {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function WorkersManager() {
  const { workers, isLoading, createWorker, updateWorker, deleteWorker } = useWorkers();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", fcmToken: "", salary: 0, active: true });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payingWorker, setPayingWorker] = useState<Worker | null>(null);

  const expandedPayments = useQuery<SalaryPayment[], Error>({
    queryKey: ["salaryPayments", "workers", expandedId],
    queryFn: () => getSalaryPayments("workers", expandedId!),
    enabled: !!expandedId,
  });

  const resetForm = () => {
    setForm({ name: "", phone: "", fcmToken: "", salary: 0, active: true });
    setEditingWorker(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      if (editingWorker) {
        await updateWorker({ id: editingWorker.id!, updates: form });
      } else {
        await createWorker({ ...form, joiningDate: new Date(), totalEarnings: 0, incrementHistory: [], holidays: [] });
      }
      resetForm();
    } catch {}
    setSaving(false);
  };

  const handleEdit = (w: Worker) => {
    setForm({ name: w.name, phone: w.phone, fcmToken: w.fcmToken, salary: w.salary, active: w.active });
    setEditingWorker(w);
    setShowForm(true);
  };

  const totalPaid = (expandedPayments.data || []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
            Workers Management
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">Manage warehouse/packing staff.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-orange-500/10">
          <Plus className="w-4 h-4" /> <span>Add Worker</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm">{editingWorker ? "Edit Worker" : "New Worker"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium" />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium" />
            <input placeholder="FCM Token" value={form.fcmToken} onChange={e => setForm({...form, fcmToken: e.target.value})} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium" />
            <div className="relative">
              <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input type="number" placeholder="Monthly Salary" value={form.salary || ""} onChange={e => setForm({...form, salary: Number(e.target.value)})} className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="worker-active" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="rounded" />
            <label htmlFor="worker-active" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Active</label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.phone.trim()} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {editingWorker ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <span className="text-zinc-500 font-semibold text-sm">Loading workers...</span>
        </div>
      ) : workers.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
          <Users className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="text-zinc-950 dark:text-white font-bold">No workers registered</span>
          <p className="text-xs text-zinc-400 mt-1">Add warehouse staff to enable order assignment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((w: Worker) => (
            <div key={w.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-orange-500/10 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white truncate">{w.name}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold">{w.phone} • ₹{w.salary}/mo</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${w.active ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                    {w.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-4 pb-3">
                <button onClick={() => setPayingWorker(w)} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold transition">
                  <IndianRupee className="w-3 h-3" /> Pay Salary
                </button>
                <button onClick={() => handleEdit(w)} className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 rounded-lg hover:text-orange-500 transition"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (confirm(`Delete ${w.name}?`)) { deleteWorker(w.id!); } }} className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 rounded-lg hover:text-rose-500 transition"><Trash className="w-3.5 h-3.5" /></button>
                <button
                  onClick={() => setExpandedId(expandedId === w.id ? null : w.id!)}
                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 rounded-lg transition ml-auto"
                >
                  {expandedId === w.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
              {expandedId === w.id && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/10">
                  <div>
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> HR Details
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <span className="text-zinc-400 font-medium">Joining Date</span>
                      <span className="text-zinc-900 dark:text-white font-semibold text-right">{formatDate(w.joiningDate)}</span>
                      <span className="text-zinc-400 font-medium">Current Salary</span>
                      <span className="text-zinc-900 dark:text-white font-semibold text-right">₹{w.salary}/mo</span>
                      <span className="text-zinc-400 font-medium">Total Earnings</span>
                      <span className="text-zinc-900 dark:text-white font-semibold text-right">₹{(w.totalEarnings || 0).toLocaleString()}</span>
                    </div>
                    {w.incrementHistory && w.incrementHistory.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Increments</p>
                        {w.incrementHistory.map((inc, i) => (
                          <div key={i} className="flex justify-between text-[11px] py-0.5">
                            <span className="text-zinc-500">{formatDate(inc.date)}</span>
                            <span className="text-emerald-600 font-bold">+₹{inc.amount}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {w.holidays && w.holidays.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Holidays</p>
                        {w.holidays.map((h, i) => (
                          <div key={i} className="flex justify-between text-[11px] py-0.5">
                            <span className="text-zinc-500">{formatDate(h.date)}</span>
                            <span className="text-zinc-700 dark:text-zinc-300">{h.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Payment History
                    </h4>
                    {expandedPayments.isLoading ? (
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                    ) : expandedPayments.data && expandedPayments.data.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {expandedPayments.data.map((p) => (
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
                    {expandedPayments.data && expandedPayments.data.length > 0 && (
                      <div className="flex justify-between text-xs font-bold mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                        <span className="text-zinc-500">Total Paid</span>
                        <span className="text-emerald-600">₹{totalPaid.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {payingWorker && (
        <SalaryPaymentModal
          personId={payingWorker.id!}
          personName={payingWorker.name}
          salary={payingWorker.salary}
          collection="workers"
          onClose={() => setPayingWorker(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["workers"] });
            if (expandedId === payingWorker.id) {
              queryClient.invalidateQueries({ queryKey: ["salaryPayments", "workers", payingWorker.id] });
            }
          }}
        />
      )}
    </div>
  );
}
