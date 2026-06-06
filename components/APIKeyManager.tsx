"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Save, RefreshCw, Eye, EyeOff, Key, ExternalLink, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getAppConfig, updateAppConfig, AppConfig } from "@/lib/firestore/appConfig";

const KEY_TEMPLATES: Record<string, { label: string; docs: string; fields: string[] }> = {
  razorpay: {
    label: "Razorpay",
    docs: "https://razorpay.com/docs/api/",
    fields: ["key", "secret"],
  },
  shiprocket: {
    label: "Shiprocket",
    docs: "https://apidocs.shiprocket.in/",
    fields: ["email", "password"],
  },
  dunzo: {
    label: "Dunzo Business",
    docs: "https://business.dunzo.com/",
    fields: ["apiKey", "apiSecret"],
  },
  shadowfax: {
    label: "Shadowfax",
    docs: "https://developer.shadowfax.in/",
    fields: ["clientId", "clientSecret"],
  },
  sms: {
    label: "SMS Provider",
    docs: "",
    fields: ["apiKey", "senderId"],
  },
  whatsapp: {
    label: "WhatsApp Business",
    docs: "https://developers.facebook.com/docs/whatsapp/",
    fields: ["phoneNumberId", "accessToken"],
  },
  gemini: {
    label: "Google Gemini AI",
    docs: "https://aistudio.google.com/apikey",
    fields: ["apiKey"],
  },
  imgbb: {
    label: "ImgBB (Image Uploads)",
    docs: "https://api.imgbb.com/",
    fields: ["apiKey"],
  },
};

export default function APIKeyManager() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [editingKeys, setEditingKeys] = useState<Record<string, Record<string, string>>>({});
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getAppConfig(true);
      setConfig(cfg);
      const initialEditing: Record<string, Record<string, string>> = {};
      Object.entries(cfg.apiKeys).forEach(([provider, data]) => {
        if (data.key) {
          initialEditing[provider] = { ...initialEditing[provider], key: data.key };
        }
      });
      if (cfg.ai?.geminiApiKey) {
        initialEditing["gemini"] = { ...initialEditing["gemini"], apiKey: cfg.ai.geminiApiKey };
      }
      if (cfg.payment?.razorpayKeyId) {
        initialEditing["razorpay"] = { ...initialEditing["razorpay"], key: cfg.payment.razorpayKeyId, secret: cfg.payment.razorpayKeySecret };
      }
      if (cfg.notifications?.smsApiKey) {
        initialEditing["sms"] = { ...initialEditing["sms"], apiKey: cfg.notifications.smsApiKey };
      }
      if (cfg.notifications?.whatsAppApiKey) {
        initialEditing["whatsapp"] = { ...initialEditing["whatsapp"], accessToken: cfg.notifications.whatsAppApiKey };
      }
      setEditingKeys(initialEditing);
    } catch { toast.error("Failed to load config"); }
    setLoading(false);
  };

  const handleKeyChange = (provider: string, field: string, value: string) => {
    setEditingKeys(prev => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const updates: Partial<AppConfig> = {};
      const apiKeys: Record<string, { key: string; secret: string; testMode: boolean; lastTested: string }> = {};
      let aiUpdate = { ...config.ai };
      let paymentUpdate = { ...config.payment };
      let notificationsUpdate = { ...config.notifications };

      Object.entries(editingKeys).forEach(([provider, fields]) => {
        const keyVal = fields.key || fields.apiKey || fields.email || fields.phoneNumberId || "";
        const secretVal = fields.secret || fields.password || fields.apiSecret || fields.clientSecret || fields.accessToken || "";
        if (keyVal) {
          apiKeys[provider] = {
            key: keyVal,
            secret: secretVal,
            testMode: false,
            lastTested: "",
          };
        }
        if (provider === "gemini" && fields.apiKey) aiUpdate.geminiApiKey = fields.apiKey;
        if (provider === "razorpay") {
          if (fields.key) paymentUpdate.razorpayKeyId = fields.key;
          if (fields.secret) paymentUpdate.razorpayKeySecret = fields.secret;
        }
        if (provider === "sms" && fields.apiKey) notificationsUpdate.smsApiKey = fields.apiKey;
        if (provider === "whatsapp" && fields.accessToken) notificationsUpdate.whatsAppApiKey = fields.accessToken;
      });

      updates.apiKeys = apiKeys;
      updates.ai = aiUpdate;
      updates.payment = paymentUpdate;
      updates.notifications = notificationsUpdate;

      await updateAppConfig(updates);
      toast.success("API keys saved securely!");
      loadConfig();
    } catch { toast.error("Failed to save API keys"); }
    setSaving(false);
  };

  const toggleVisibility = (field: string) => {
    setVisibleKeys(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const maskValue = (val: string, visible: boolean) => {
    if (!val) return "";
    if (visible) return val;
    if (val.length <= 8) return "********";
    return val.substring(0, 4) + "****" + val.substring(val.length - 4);
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            <Shield className="w-6 h-6 inline mr-2" />
            API Key Manager
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Store encrypted keys in Firestore — loaded dynamically by server at runtime
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadConfig} className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 transition flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Keys
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(KEY_TEMPLATES).map(([provider, tmpl]) => {
          const isSelected = selectedProvider === provider;
          const hasKeys = editingKeys[provider] && Object.values(editingKeys[provider]).some(v => v);
          return (
            <button key={provider} onClick={() => setSelectedProvider(isSelected ? null : provider)}
              className={`text-left p-4 border rounded-2xl transition-all ${isSelected ? "border-emerald-500 bg-emerald-50 shadow-md" : hasKeys ? "border-emerald-200 bg-white shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
              <div className="flex items-center gap-2">
                <Key className={`w-4 h-4 ${isSelected ? "text-emerald-500" : "text-zinc-400"}`} />
                <span className={`text-sm font-bold ${isSelected ? "text-emerald-700" : "text-zinc-700"}`}>{tmpl.label}</span>
                {hasKeys && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">{tmpl.fields.join(", ")}</p>
            </button>
          );
        })}
      </div>

      {selectedProvider && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-zinc-800">{KEY_TEMPLATES[selectedProvider].label} Keys</h3>
            {KEY_TEMPLATES[selectedProvider].docs && (
              <a href={KEY_TEMPLATES[selectedProvider].docs} target="_blank" rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="space-y-3">
            {KEY_TEMPLATES[selectedProvider].fields.map(field => {
              const fieldKey = `${selectedProvider}_${field}`;
              const value = editingKeys[selectedProvider]?.[field] || "";
              return (
                <div key={fieldKey}>
                  <label className="text-xs font-semibold text-zinc-500 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <input type={visibleKeys[fieldKey] ? "text" : "password"}
                        value={value} onChange={e => handleKeyChange(selectedProvider, field, e.target.value)}
                        className="w-full px-3 py-2 pr-10 rounded-xl border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder={`Enter ${field}`} />
                      <button type="button" onClick={() => toggleVisibility(fieldKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                        {visibleKeys[fieldKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {value && (
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">{maskValue(value, visibleKeys[fieldKey])}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> Security Notes</h3>
        <ul className="text-[10px] text-emerald-700 space-y-1">
          <li>Keys are stored in Firestore `config/appConfig` and loaded by server every hour</li>
          <li>Call <code className="bg-emerald-100 px-1 rounded">/api/refresh-config</code> to force immediate key reload</li>
          <li>Existing keys are masked by default — only you can view them</li>
          <li>No keys stored in code, environment variables, or build artifacts</li>
        </ul>
      </div>
    </div>
  );
}
