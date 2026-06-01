// components/PolicyEditor.tsx
"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import toast from "react-hot-toast";
import { Save, Loader2, FileText } from "lucide-react";

type PolicyType = "shipping" | "refund" | "privacy" | "terms" | "contact";

const POLICY_CONFIG: Record<PolicyType, { title: string; placeholder: string }> = {
  shipping: {
    title: "Shipping Policy",
    placeholder: "Enter your shipping policy...\n\nExample:\n- Delivery areas: [list areas]\n- Delivery time: 30-60 minutes\n- Minimum order value: ₹49\n- Delivery charges: ₹29\n- Free delivery above: ₹299",
  },
  refund: {
    title: "Refund Policy",
    placeholder: "Enter your refund policy...\n\nExample:\n- Refund within 24 hours of delivery\n- Damaged/missing items eligible\n- Refund to original payment method\n- Processing time: 3-5 business days",
  },
  privacy: {
    title: "Privacy Policy",
    placeholder: "Enter your privacy policy...\n\nExample:\n- We collect name, phone, address\n- Data used for order delivery only\n- No data shared with third parties\n- Contact us for data deletion requests",
  },
  terms: {
    title: "Terms & Conditions",
    placeholder: "Enter your terms and conditions...\n\nExample:\n- Orders subject to availability\n- Prices may change without notice\n- User responsible for account security\n- We reserve the right to cancel orders",
  },
  contact: {
    title: "Contact Us",
    placeholder: "Enter your contact information...\n\nExample:\nPhone: +91 XXXXX XXXXX\nEmail: example@store.com\nAddress: 123 Street, City, State\nWorking Hours: 9 AM - 9 PM",
  },
};

export default function PolicyEditor({ policyType }: { policyType: PolicyType }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const config = POLICY_CONFIG[policyType];

  useEffect(() => {
    loadPolicy();
  }, [policyType]);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "policies", policyType);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setContent(snap.data().content || "");
      } else {
        setContent("");
      }
    } catch (err) {
      console.error("Error loading policy:", err);
      toast.error("Failed to load policy");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "policies", policyType), {
        content,
        updatedAt: Date.now(),
      });
      toast.success(`${config.title} saved!`);
    } catch (err) {
      console.error("Error saving policy:", err);
      toast.error("Failed to save policy");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
        <div className="flex items-center gap-3 p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{config.title}</h2>
            <p className="text-xs text-zinc-500">This content will be displayed on your customer website</p>
          </div>
        </div>

        <div className="p-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={config.placeholder}
            rows={16}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-y text-sm leading-relaxed"
          />
        </div>

        <div className="flex justify-end p-6 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}
