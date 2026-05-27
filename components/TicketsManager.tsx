"use client";

import React, { useState } from "react";
import {
  Loader2, Ticket, CheckCircle2, Clock, Package, AlertCircle,
  Send, Reply, User,
} from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import { Ticket as TicketType } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
  "in-progress": "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  resolved: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
};

const STATUS_ICONS: Record<string, any> = {
  open: AlertCircle,
  "in-progress": Clock,
  resolved: CheckCircle2,
};

export default function TicketsManager() {
  const { tickets, isLoading, replyToTicket, updateTicketStatus, resolveTicket } = useTickets();
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});

  const handleReply = async (ticketId: string) => {
    const msg = replyText[ticketId]?.trim();
    if (!msg) return;
    setSendingReply((prev) => ({ ...prev, [ticketId]: true }));
    try {
      await replyToTicket({ id: ticketId, message: msg });
      setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
    } catch {}
    setSendingReply((prev) => ({ ...prev, [ticketId]: false }));
  };

  const unresolved = tickets.filter((t: TicketType) => t.status !== "resolved");
  const resolvedList = tickets.filter((t: TicketType) => t.status === "resolved");

  const renderTicket = (t: TicketType) => {
    const StatusIcon = STATUS_ICONS[t.status || "open"];

    return (
      <div key={t.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${STATUS_COLORS[t.status || "open"]}`}>
                  <StatusIcon className="w-2.5 h-2.5" />
                  {(t.status || "open").charAt(0).toUpperCase() + (t.status || "open").slice(1)}
                </span>
                <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-[8px] font-medium">{t.type}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                <Package className="w-3.5 h-3.5" />
                <span className="font-semibold">{t.productId}</span>
              </div>
              {t.orderId && <p className="text-[10px] text-zinc-400">Order: {t.orderId}</p>}
              {t.workerId && <p className="text-[10px] text-zinc-400 flex items-center gap-1"><User className="w-3 h-3" /> Worker: {t.workerId.slice(0, 12)}...</p>}
            </div>
            {t.status !== "resolved" && (
              <button onClick={() => resolveTicket(t.id!)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0 transition">
                <CheckCircle2 className="w-3 h-3" /> Resolve
              </button>
            )}
          </div>

          {/* Worker message */}
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 mt-3 border border-zinc-100 dark:border-zinc-800">
            {t.message || "No description"}
          </p>
          {t.createdAt && <p className="text-[9px] text-zinc-400 mt-1.5">{new Date(t.createdAt.seconds * 1000).toLocaleString()}</p>}
        </div>

        {/* Replies */}
        {t.replies && t.replies.length > 0 && (
          <div className="px-4 py-3 bg-blue-50/50 dark:bg-blue-950/10 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-2">Conversation</p>
            <div className="space-y-2">
              {t.replies.map((r, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    r.by === "owner" ? "bg-emerald-500/10" : "bg-amber-500/10"
                  }`}>
                    <Reply className={`w-3 h-3 ${r.by === "owner" ? "text-emerald-600" : "text-amber-600"}`} />
                  </div>
                  <div className="flex-1 bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-100 dark:border-zinc-700">
                    <p className={`text-[10px] font-semibold ${r.by === "owner" ? "text-emerald-600" : "text-amber-600"}`}>
                      {r.by === "owner" ? "Owner" : "Worker"}
                    </p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">{r.message}</p>
                    <p className="text-[9px] text-zinc-400 mt-1">
                      {r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reply input */}
        {t.status !== "resolved" && (
          <div className="p-4">
            <div className="flex gap-2">
              <input
                value={replyText[t.id!] || ""}
                onChange={(e) => setReplyText((prev) => ({ ...prev, [t.id!]: e.target.value }))}
                placeholder="Type your reply to the worker..."
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                onKeyDown={(e) => { if (e.key === "Enter") handleReply(t.id!); }}
              />
              <button
                onClick={() => handleReply(t.id!)}
                disabled={sendingReply[t.id!] || !replyText[t.id!]?.trim()}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50 transition shrink-0"
              >
                {sendingReply[t.id!] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">
          Stock Shortage Tickets
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">
          Tickets raised by workers when stock runs out during packing. Reply, track status, and resolve.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <span className="text-zinc-500 font-semibold text-sm">Loading tickets...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
          <Ticket className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="text-zinc-950 dark:text-white font-bold">No tickets raised</span>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">Stock shortage tickets from workers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Unresolved */}
          {unresolved.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Open ({unresolved.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {unresolved.map(renderTicket)}
              </div>
            </div>
          )}

          {/* Resolved */}
          {resolvedList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Resolved ({resolvedList.length})
              </h3>
              <div className="grid grid-cols-1 gap-3 opacity-60">
                {resolvedList.map(renderTicket)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
