"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { Plus, Trash2, Edit3, Save, X, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

interface FAQ {
  id?: string;
  question: string;
  answer: string;
  category?: string;
  active?: boolean;
  createdAt?: any;
}

export default function FAQManager() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FAQ>({ question: "", answer: "", category: "general", active: true });

  useEffect(() => { loadFaqs(); }, []);

  const loadFaqs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "chatbotFAQ"));
      setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() } as FAQ)));
    } catch { toast.error("Failed to load FAQs"); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      return toast.error("Question and answer are required");
    }
    try {
      if (editing?.id) {
        await updateDoc(doc(db, "chatbotFAQ", editing.id), {
          question: form.question, answer: form.answer,
          category: form.category, active: form.active, updatedAt: serverTimestamp(),
        });
        toast.success("FAQ updated");
      } else {
        await addDoc(collection(db, "chatbotFAQ"), {
          ...form, createdAt: serverTimestamp(),
        });
        toast.success("FAQ created");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ question: "", answer: "", category: "general", active: true });
      loadFaqs();
    } catch { toast.error("Failed to save FAQ"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await deleteDoc(doc(db, "chatbotFAQ", id));
      toast.success("FAQ deleted");
      loadFaqs();
    } catch { toast.error("Failed to delete"); }
  };

  const startEdit = (faq: FAQ) => {
    setEditing(faq);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category || "general", active: faq.active !== false });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-emerald-500" /> Chatbot FAQ Manager
        </h2>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ question: "", answer: "", category: "general", active: true }); }}
          className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-emerald-600 transition">
          <Plus className="w-4 h-4" /> Add FAQ
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">{editing ? "Edit FAQ" : "New FAQ"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
          </div>
          <input placeholder="Question" value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-zinc-800" />
          <textarea placeholder="Answer" value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} rows={3}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-zinc-800" />
          <div className="flex gap-4">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-zinc-800">
              <option value="general">General</option>
              <option value="delivery">Delivery</option>
              <option value="payment">Payment</option>
              <option value="returns">Returns</option>
              <option value="products">Products</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active !== false} onChange={e => setForm({ ...form, active: e.target.checked })} className="rounded" />
              Active
            </label>
          </div>
          <button onClick={handleSave} className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-semibold hover:bg-emerald-600 transition flex items-center gap-2">
            <Save className="w-4 h-4" /> {editing ? "Update" : "Create"}
          </button>
        </div>
      )}

      {loading ? <p className="text-zinc-500">Loading...</p> : faqs.length === 0 ? (
        <p className="text-zinc-500 text-center py-8">No FAQs yet. Add one to power the chatbot.</p>
      ) : (
        <div className="space-y-3">
          {faqs.map(faq => (
            <div key={faq.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">{faq.category || "general"}</span>
                  {faq.active === false && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Inactive</span>}
                </div>
                <p className="font-semibold text-sm truncate">{faq.question}</p>
                <p className="text-xs text-zinc-500 truncate mt-1">{faq.answer}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(faq)} className="p-2 text-zinc-400 hover:text-emerald-500 transition"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(faq.id!)} className="p-2 text-zinc-400 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
