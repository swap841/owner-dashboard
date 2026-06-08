"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection, getDocs, query, orderBy, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp
} from "firebase/firestore";
import { Star, Trash2, AlertCircle, CheckCircle, Filter, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Review {
  id?: string;
  userId: string;
  userName?: string;
  productId: string;
  productName?: string;
  rating: number;
  comment: string;
  createdAt: Timestamp | Date;
  helpful?: number;
  reported?: boolean;
}

export default function ReviewsViewer() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "reported" | "high" | "low">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => { loadReviews(); }, [filter, page]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc")));
      let all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      if (filter === "reported") all = all.filter(r => r.reported);
      if (filter === "high") all = all.filter(r => r.rating >= 4);
      if (filter === "low") all = all.filter(r => r.rating <= 2);
      setReviews(all.slice((page - 1) * pageSize, page * pageSize));
    } catch { toast.error("Failed to load reviews"); }
    setLoading(false);
  };

  const formatDate = (ts: Timestamp | Date) => {
    const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const stars = (n: number) => <span className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < n ? "text-amber-400 fill-current" : "text-zinc-300"}`} />)}</span>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500" /> Customer Reviews
        </h2>
        <div className="flex gap-2">
          <select value={filter} onChange={e => { setFilter(e.target.value as any); setPage(1); }}
            className="border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm bg-white dark:bg-zinc-800">
            <option value="all">All Reviews</option>
            <option value="reported">Reported Only</option>
            <option value="high">⭐ 4-5 Stars</option>
            <option value="low">⭐ 1-2 Stars</option>
          </select>
        </div>
      </div>

      {loading ? <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto my-8" /> : reviews.length === 0 ? (
        <p className="text-zinc-500 text-center py-8">No reviews found.</p>
      ) : (
        <div className="space-y-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Product</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Rating</th>
                <th className="px-4 py-3 text-left font-semibold">Comment</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 font-medium">{r.productName || r.productId}</td>
                  <td className="px-4 py-3">{r.userName || r.userId}</td>
                  <td className="px-4 py-3">{stars(r.rating)} <span className="text-xs text-zinc-500">({r.rating}/5)</span></td>
                  <td className="px-4 py-3 max-w-xs truncate">{r.comment}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(r.createdAt)}</td>
              <td className="px-4 py-3">
                {r.reported ? (
                  <span title="Reported"><AlertCircle className="w-5 h-5 text-red-500 inline" /></span>
                ) : (
                  <span title="OK"><CheckCircle className="w-5 h-5 text-emerald-500 inline" /></span>
                )}
              </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm disabled:opacity-50">Previous</button>
        <span className="text-sm text-zinc-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={reviews.length < pageSize}
          className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
