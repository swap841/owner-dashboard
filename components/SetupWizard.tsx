"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Check, ArrowRight, ArrowLeft, Store, MapPin, CreditCard, Users, Bell, Settings, Sparkles, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "@/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAppConfig, updateAppConfig, getDefaultConfig, AppConfig } from "@/lib/firestore/appConfig";
import { updateContactInfo } from "@/lib/firestore/contacts";

const STEPS = [
  { id: "welcome", label: "Welcome", icon: Sparkles },
  { id: "business", label: "Business Info", icon: Store },
  { id: "delivery", label: "Delivery Zones", icon: MapPin },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "workers", label: "Workers", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "features", label: "Features", icon: Settings },
  { id: "complete", label: "Complete", icon: Check },
];

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<AppConfig>(getDefaultConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWorkerEmail, setNewWorkerEmail] = useState("");
  const [newDeliveryBoyEmail, setNewDeliveryBoyEmail] = useState("");
  const [setupCompleted, setSetupCompleted] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const cfg = await getAppConfig(true);
        if (cfg.business.name && cfg.business.name !== "My Store") {
          setSetupCompleted(true);
        }
        setConfig(cfg);
      } catch {
        // defaults
      }
      setLoading(false);
    };
    check();
  }, []);

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  if (setupCompleted) {
    return (
      <div className="py-20 flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <Check className="w-16 h-16 text-emerald-500" />
        <h2 className="text-2xl font-black">Setup Already Complete</h2>
        <p className="text-sm text-zinc-500">Your store has already been configured. Use Store Config to update settings.</p>
        <button onClick={onComplete} className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm">
          Go to Dashboard
        </button>
      </div>
    );
  }

  const update = (section: string, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...(prev as any)[section], [key]: value },
    }));
  };

  const updateNested = (section: string, sub: string, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [sub]: { ...(prev as any)[section]?.[sub], [key]: value },
      },
    }));
  };

  const canProceed = () => {
    const step = STEPS[currentStep].id;
    if (step === "business") return config.business.name.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "appConfig", "settings"), { ...config, updatedAt: serverTimestamp() }, { merge: true });
      await updateContactInfo({
        storeName: config.business.name,
        phone: config.contact.phone,
        email: config.contact.email,
        address: config.contact.address || config.store.location.address,
        logoUrl: config.business.logoUrl,
        tagline: "Fresh Grocery Express",
      });
      toast.success("Setup complete! Your store is ready.");
      setSetupCompleted(true);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to save setup");
    }
    setSaving(false);
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case "welcome":
        return (
          <div className="text-center py-8 space-y-4">
            <Sparkles className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-black">Welcome to Your Store Setup!</h2>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Let's get your store up and running in just a few steps. You can always change these settings later.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto mt-6">
              {STEPS.filter(s => s.id !== "welcome" && s.id !== "complete").map(s => (
                <div key={s.id} className="p-3 bg-emerald-50 rounded-xl text-center">
                  <s.icon className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-emerald-700">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "business":
        return (
          <div className="space-y-4 py-4">
            <h2 className="text-lg font-bold">Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500">Store Name</label>
                <input type="text" value={config.business.name} onChange={e => update("business", "name", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="My Store" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Business Type</label>
                <select value={config.business.type} onChange={e => update("business", "type", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none">
                  <option value="grocery">Grocery</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="general">General Store</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Currency</label>
                <select value={config.business.currency} onChange={e => update("business", "currency", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Tax / GST Rate (%)</label>
                <input type="number" value={config.business.taxRate} onChange={e => update("business", "taxRate", Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Order Prefix</label>
                <input type="text" value={config.business.orderPrefix} onChange={e => update("business", "orderPrefix", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" placeholder="ORD-" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Logo URL</label>
                <input type="text" value={config.business.logoUrl} onChange={e => update("business", "logoUrl", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" placeholder="https://..." />
              </div>
            </div>
          </div>
        );

      case "delivery":
        return (
          <div className="space-y-4 py-4">
            <h2 className="text-lg font-bold">Delivery Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500">Minimum Order Value (₹)</label>
                <input type="number" value={config.store.minOrderValue} onChange={e => update("store", "minOrderValue", Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Standard Delivery Charge (₹)</label>
                <input type="number" value={config.store.deliveryCharge} onChange={e => update("store", "deliveryCharge", Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Free Delivery Above (₹)</label>
                <input type="number" value={config.store.freeDeliveryAbove} onChange={e => update("store", "freeDeliveryAbove", Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Max Local Weight (kg)</label>
                <input type="number" value={config.deliveryZones.maxLocalWeightKg} onChange={e => update("deliveryZones", "maxLocalWeightKg", Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Enable Delivery Zones</span>
              <button onClick={() => setConfig({ ...config, deliveryZones: { ...config.deliveryZones, enabled: !config.deliveryZones.enabled } })}
                className={`w-12 h-6 rounded-full transition-colors ${config.deliveryZones.enabled ? "bg-emerald-500" : "bg-zinc-300"} relative`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.deliveryZones.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        );

      case "payment":
        return (
          <div className="space-y-4 py-4">
            <h2 className="text-lg font-bold">Payment Settings</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Cash on Delivery</span>
                <button onClick={() => update("payment", "codEnabled", !config.payment.codEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${config.payment.codEnabled ? "bg-emerald-500" : "bg-zinc-300"} relative`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.payment.codEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Razorpay (Cards/UPI)</span>
                <button onClick={() => update("payment", "razorpayEnabled", !config.payment.razorpayEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${config.payment.razorpayEnabled ? "bg-emerald-500" : "bg-zinc-300"} relative`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.payment.razorpayEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
              {config.payment.razorpayEnabled && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500">Razorpay Key ID</label>
                    <input type="text" value={config.payment.razorpayKeyId} onChange={e => update("payment", "razorpayKeyId", e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500">Razorpay Key Secret</label>
                    <input type="password" value={config.payment.razorpayKeySecret} onChange={e => update("payment", "razorpayKeySecret", e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-semibold text-zinc-500">Auto-cancel unpaid orders after (minutes)</label>
                <input type="number" value={config.payment.autoCancelUnpaidMinutes} onChange={e => update("payment", "autoCancelUnpaidMinutes", Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
              </div>
            </div>
          </div>
        );

      case "workers":
        return (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Worker Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500">Daily Wage (₹)</label>
                  <input type="number" value={config.workers.wagesDaily} onChange={e => update("workers", "wagesDaily", Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500">Hourly Wage (₹)</label>
                  <input type="number" value={config.workers.wagesHourly} onChange={e => update("workers", "wagesHourly", Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">Enable Clock In/Out</span>
                <button onClick={() => update("workers", "enableClockInOut", !config.workers.enableClockInOut)}
                  className={`w-12 h-6 rounded-full transition-colors ${config.workers.enableClockInOut ? "bg-emerald-500" : "bg-zinc-300"} relative`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${config.workers.enableClockInOut ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-3">
              <h3 className="text-sm font-bold text-zinc-800">Worker Email Access</h3>
              <p className="text-xs text-zinc-500">Emails that can sign in to the Worker Android app.</p>
              <div className="flex gap-2">
                <input type="email" value={newWorkerEmail} onChange={e => setNewWorkerEmail(e.target.value)}
                  placeholder="worker@example.com"
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
                <button onClick={() => {
                  const email = newWorkerEmail.trim().toLowerCase();
                  if (!email) return toast.error("Enter an email");
                  if (config.workers.workerEmails.includes(email)) return toast.error("Email already added");
                  setConfig({ ...config, workers: { ...config.workers, workerEmails: [...config.workers.workerEmails, email] } });
                  setNewWorkerEmail("");
                }} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition">Add</button>
              </div>
              {config.workers.workerEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.workers.workerEmails.map((email, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                      {email}
                      <button onClick={() => setConfig({ ...config, workers: { ...config.workers, workerEmails: config.workers.workerEmails.filter((_, idx) => idx !== i) } })}
                        className="hover:text-red-500 ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-3">
              <h3 className="text-sm font-bold text-zinc-800">Delivery Boy Email Access</h3>
              <p className="text-xs text-zinc-500">Emails that can sign in to the Delivery Boy Android app.</p>
              <div className="flex gap-2">
                <input type="email" value={newDeliveryBoyEmail} onChange={e => setNewDeliveryBoyEmail(e.target.value)}
                  placeholder="delivery@example.com"
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none" />
                <button onClick={() => {
                  const email = newDeliveryBoyEmail.trim().toLowerCase();
                  if (!email) return toast.error("Enter an email");
                  if (config.workers.deliveryBoyEmails.includes(email)) return toast.error("Email already added");
                  setConfig({ ...config, workers: { ...config.workers, deliveryBoyEmails: [...config.workers.deliveryBoyEmails, email] } });
                  setNewDeliveryBoyEmail("");
                }} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition">Add</button>
              </div>
              {config.workers.deliveryBoyEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.workers.deliveryBoyEmails.map((email, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                      {email}
                      <button onClick={() => setConfig({ ...config, workers: { ...config.workers, deliveryBoyEmails: config.workers.deliveryBoyEmails.filter((_, idx) => idx !== i) } })}
                        className="hover:text-red-500 ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4 py-4">
            <h2 className="text-lg font-bold">Notification Settings</h2>
            <p className="text-xs text-zinc-500">Configure notification provider API keys later in API Key Manager.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500">SMS Provider</label>
                <select value={config.notifications.smsProvider} onChange={e => update("notifications", "smsProvider", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none">
                  <option value="">None</option>
                  <option value="twilio">Twilio</option>
                  <option value="msg91">MSG91</option>
                  <option value="textlocal">TextLocal</option>
                  <option value="custom">Custom API</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "features":
        return (
          <div className="space-y-4 py-4">
            <h2 className="text-lg font-bold">Feature Toggles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(config.features).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                  <span className="text-sm font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <button onClick={() => update("features", key, !val)}
                    className={`w-12 h-6 rounded-full transition-colors ${val ? "bg-emerald-500" : "bg-zinc-300"} relative`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${val ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="text-center py-8 space-y-4">
            <Check className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-black">Ready to Launch!</h2>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Your store is configured and ready. Click "Finish" to save everything and start accepting orders!
            </p>
            <div className="bg-emerald-50 rounded-2xl p-4 max-w-sm mx-auto">
              <p className="text-sm font-bold text-emerald-800">{config.business.name}</p>
              <p className="text-xs text-emerald-600">
                {config.business.type} | {config.business.currency} | {config.payment.codEnabled ? "COD ✓" : ""} {config.payment.razorpayEnabled ? "Razorpay ✓" : ""}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          <Sparkles className="w-6 h-6 inline mr-2" />
          Setup Wizard
        </h1>
        <span className="text-xs text-zinc-400 font-medium">Step {currentStep + 1} of {STEPS.length}</span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= currentStep ? "bg-emerald-500" : "bg-zinc-200"}`} />
        ))}
      </div>

      {/* Step labels */}
      <div className="hidden md:flex justify-between">
        {STEPS.map((s, i) => (
          <button key={s.id} onClick={() => { if (i < currentStep) setCurrentStep(i); }}
            className={`flex items-center gap-1 text-xs font-semibold transition-colors ${i === currentStep ? "text-emerald-600" : i < currentStep ? "text-emerald-500 hover:text-emerald-700" : "text-zinc-400"}`}>
            <s.icon className="w-3 h-3" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm min-h-[300px]">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={handlePrev} disabled={currentStep === 0}
          className="px-5 py-2 border border-zinc-200 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-zinc-50 transition flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {currentStep < STEPS.length - 1 ? (
          <button onClick={handleNext} disabled={!canProceed()}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold disabled:opacity-30 hover:shadow-lg transition flex items-center gap-1">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleFinish} disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving..." : "Finish Setup"}
          </button>
        )}
      </div>
    </div>
  );
}
