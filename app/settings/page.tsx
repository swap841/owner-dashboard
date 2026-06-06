"use client";
import React, { useState, useEffect } from "react";
import { RefreshCw, Clock } from "lucide-react";
import toast from "react-hot-toast";
import StoreConfigEditor from "@/components/StoreConfigEditor";
import { getAppConfig, clearAppConfigCache } from "@/lib/firestore/appConfig";

export default function SettingsPage() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    getAppConfig(true).then(cfg => {
      if (cfg.updatedAt?.toDate) setLastUpdated(cfg.updatedAt.toDate().toLocaleString());
    }).catch(() => {});
  }, []);

  const clearCache = () => {
    clearAppConfigCache();
    getAppConfig(true).then(cfg => {
      if (cfg.updatedAt?.toDate) setLastUpdated(cfg.updatedAt.toDate().toLocaleString());
      toast.success("Cache cleared — config reloaded");
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Settings
            </h1>
            {lastUpdated && (
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last config update: {lastUpdated}
              </p>
            )}
          </div>
          <button onClick={clearCache}
            className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 transition flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Clear Cache
          </button>
        </div>
        <StoreConfigEditor />
      </div>
    </div>
  );
}
