"use client";

import React, { useState } from "react";
import {
  Loader2, MessageSquare, Mail, CheckCircle2, Trash2, User, Package, ExternalLink,
  Send, Reply, RotateCcw, Clock, AlertCircle, Bug,
} from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { Contact, ContactReply } from "@/types";

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

export default function ContactsManager() {
  const { contacts, isLoading, replyToContact, updateContactStatus, createReplacementOrder, deleteContact } = useContacts();
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});
  const [reordering, setReordering] = useState<Record<string, boolean>>({});

  const handleReply = async (contactId: string) => {
    const msg = replyText[contactId]?.trim();
    if (!msg) return;
    setSendingReply((prev) => ({ ...prev, [contactId]: true }));
    try {
      await replyToContact({ id: contactId, message: msg });
      setReplyText((prev) => ({ ...prev, [contactId]: "" }));
    } catch {}
    setSendingReply((prev) => ({ ...prev, [contactId]: false }));
  };

  const handleReorder = async (contactId: string) => {
    setReordering((prev) => ({ ...prev, [contactId]: true }));
    await createReplacementOrder(contactId);
    setReordering((prev) => ({ ...prev, [contactId]: false }));
  };

  const unresolved = contacts.filter((c) => c.status !== "resolved");
  const resolved = contacts.filter((c) => c.status === "resolved");

  const renderContact = (c: Contact) => {
    const StatusIcon = STATUS_ICONS[c.status || "open"];

    return (
      <div key={c.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{c.name}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${STATUS_COLORS[c.status || "open"]}`}>
                  <StatusIcon className="w-2.5 h-2.5" />
                  {(c.status || "open").charAt(0).toUpperCase() + (c.status || "open").slice(1)}
                </span>
                {c.subject && (
                  <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-[8px] font-medium">{c.subject}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>
                {c.userId && <span className="flex items-center gap-1"><User className="w-3 h-3" /> ID: {c.userId.slice(0, 12)}...</span>}
                {c.orderId && (
                  <a href={`/orders/${c.orderId}`} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium">
                    <Package className="w-3 h-3" /> Order: {c.orderId.slice(0, 8)}... <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {c.replacementOrderId && (
                  <a href={`/orders/${c.replacementOrderId}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                    <RotateCcw className="w-3 h-3" /> Replacement: {c.replacementOrderId.slice(0, 8)}... <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => { if (confirm("Delete this complaint permanently?")) deleteContact(c.id!); }}
              className="p-1.5 border border-zinc-200 dark:border-zinc-700 hover:border-rose-500 rounded-lg hover:text-rose-500 transition shrink-0"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Original message */}
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 mt-3 border border-zinc-100 dark:border-zinc-800">
            {c.message}
          </p>
          {c.createdAt && (
            <p className="text-[9px] text-zinc-400 mt-1.5">
              {new Date(c.createdAt.seconds * 1000).toLocaleString()}
            </p>
          )}
        </div>

        {/* Replies */}
        {c.replies && c.replies.length > 0 && (
          <div className="px-4 py-3 bg-blue-50/50 dark:bg-blue-950/10 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-2">Conversation</p>
            <div className="space-y-2">
              {c.replies.map((r, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Reply className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div className="flex-1 bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-100 dark:border-zinc-700">
                    <p className="text-[10px] font-semibold text-emerald-600">Owner</p>
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

        {/* Actions */}
        <div className="p-4 space-y-3">
          {/* Status actions */}
          {c.status !== "resolved" && (
            <div className="flex gap-2 flex-wrap">
              {c.status === "open" && (
                <button
                  onClick={() => updateContactStatus({ id: c.id!, status: "in-progress" })}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition"
                >
                  <Clock className="w-3 h-3" /> Mark In Progress
                </button>
              )}
              {c.status === "in-progress" && (
                <button
                  onClick={() => updateContactStatus({ id: c.id!, status: "resolved" })}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition"
                >
                  <CheckCircle2 className="w-3 h-3" /> Resolve
                </button>
              )}
            </div>
          )}

          {/* Re-deliver button */}
          {c.status !== "resolved" && c.userId && c.orderId && !c.replacementOrderId && (
            <button
              onClick={() => handleReorder(c.id!)}
              disabled={reordering[c.id!]}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition disabled:opacity-50"
            >
              {reordering[c.id!] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Re-deliver Items
            </button>
          )}

          {/* Reply form */}
          {c.status !== "resolved" && (
            <div className="flex gap-2">
              <input
                value={replyText[c.id!] || ""}
                onChange={(e) => setReplyText((prev) => ({ ...prev, [c.id!]: e.target.value }))}
                placeholder="Type your reply to the customer..."
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                onKeyDown={(e) => { if (e.key === "Enter") handleReply(c.id!); }}
              />
              <button
                onClick={() => handleReply(c.id!)}
                disabled={sendingReply[c.id!] || !replyText[c.id!]?.trim()}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50 transition shrink-0"
              >
                {sendingReply[c.id!] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
          Customer Support
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">
          Review customer complaints, reply with resolutions, and create replacement orders.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          <span className="text-zinc-500 font-semibold text-sm">Loading complaints...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
          <MessageSquare className="w-12 h-12 text-zinc-400 mb-3" />
          <span className="text-zinc-950 dark:text-white font-bold">All clear</span>
          <p className="text-xs text-zinc-400 mt-1">No pending complaints from customers.</p>
        </div>
      ) : (
        <>
          {/* Unresolved */}
          {unresolved.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Open ({unresolved.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {unresolved.map(renderContact)}
              </div>
            </div>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Resolved ({resolved.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 opacity-60">
                {resolved.map(renderContact)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
