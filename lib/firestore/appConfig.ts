import { db } from "@/firebaseConfig";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export interface AppConfig {
  id?: string;
  business: {
    type: "grocery" | "restaurant" | "pharmacy" | "electronics" | "clothing" | "general";
    name: string;
    currency: "INR" | "USD" | "EUR";
    currencySymbol: string;
    taxRate: number;
    taxName: string;
    orderPrefix: string;
    invoiceFooter: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    accentColor: string;
    font: string;
  };
  store: {
    isOpen: boolean;
    maintenanceMode: boolean;
    minOrderValue: number;
    deliveryCharge: number;
    freeDeliveryAbove: number;
    taxPercent: number;
    location: { address: string; lat: number; lng: number };
  };
  features: {
    voiceSearch: boolean;
    wishlist: boolean;
    coupons: boolean;
    reviews: boolean;
    chatbot: boolean;
    loyalty: boolean;
    posMode: boolean;
    creditSystem: boolean;
    offlineMode: boolean;
    loyaltyPoints: boolean;
    whatsappReports: boolean;
    voiceAlerts: boolean;
    printBill: boolean;
  };
  seo: { metaTitle: string; metaDescription: string };
  contact: { phone: string; email: string; address: string };
  ai: { geminiApiKey: string };
  deliveryZones: {
    enabled: boolean;
    localPincodes: string[];
    deliveryCharges: Record<string, number>;
    freeDeliveryThresholds: Record<string, number>;
    estimatedDeliveryHours: Record<string, number>;
    maxLocalWeightKg: number;
    outOfCityHandling: "partner" | "disable" | "manual";
  };
  payment: {
    codEnabled: boolean;
    razorpayEnabled: boolean;
    razorpayKeyId: string;
    razorpayKeySecret: string;
    autoCancelUnpaidMinutes: number;
    paymentReminderHours: number;
  };
  workers: {
    wagesDaily: number;
    wagesHourly: number;
    workerPINs: Record<string, string>;
    enableClockInOut: boolean;
    workerEmails: string[];
    deliveryBoyEmails: string[];
  };
  notifications: {
    smsTemplates: Record<string, string>;
    whatsappTemplates: Record<string, string>;
    smsProvider: string;
    smsApiKey: string;
    smsFlowId: string;
    whatsAppApiKey: string;
    whatsAppPhoneNumberId: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioPhoneNumber: string;
    voiceWebhookUrl: string;
    whatsappWebhook: string;
  };
  deliveryPartners: {
    primary: string;
    priority: string[];
    partnerCredentials: Record<string, { apiKey: string; apiSecret: string; enabled: boolean }>;
  };
  apiKeys: Record<string, { key: string; secret: string; testMode: boolean; lastTested: string }>;
  updatedAt?: any;
}

const CONFIG_DOC_ID = "settings";
const CONFIG_COLLECTION = "appConfig";

export function getDefaultConfig(): AppConfig {
  return {
    business: {
      type: "general",
      name: "My Store",
      currency: "INR",
      currencySymbol: "₹",
      taxRate: 5,
      taxName: "GST",
      orderPrefix: "ORD-",
      invoiceFooter: "Thank you for your order!",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "#059669",
      accentColor: "#0D9488",
      font: "Inter, system-ui",
    },
    store: {
      isOpen: true,
      maintenanceMode: false,
      minOrderValue: 199,
      deliveryCharge: 40,
      freeDeliveryAbove: 499,
      taxPercent: 5,
      location: { address: "", lat: 0, lng: 0 },
    },
    features: {
      voiceSearch: true,
      wishlist: true,
      coupons: true,
      reviews: true,
      chatbot: true,
      loyalty: false,
      posMode: false,
      creditSystem: false,
      offlineMode: false,
      loyaltyPoints: false,
      whatsappReports: false,
      voiceAlerts: false,
      printBill: false,
    },
    seo: { metaTitle: "", metaDescription: "" },
    contact: { phone: "", email: "", address: "" },
    ai: { geminiApiKey: "" },
    deliveryZones: {
      enabled: false,
      localPincodes: [],
      deliveryCharges: {},
      freeDeliveryThresholds: {},
      estimatedDeliveryHours: {},
      maxLocalWeightKg: 10,
      outOfCityHandling: "manual",
    },
    payment: {
      codEnabled: true,
      razorpayEnabled: false,
      razorpayKeyId: "",
      razorpayKeySecret: "",
      autoCancelUnpaidMinutes: 30,
      paymentReminderHours: 2,
    },
    workers: {
      wagesDaily: 500,
      wagesHourly: 80,
      workerPINs: {},
      enableClockInOut: true,
      workerEmails: [],
      deliveryBoyEmails: [],
    },
    notifications: {
      smsTemplates: {},
      whatsappTemplates: {},
      smsProvider: "",
      smsApiKey: "",
      smsFlowId: "",
      whatsAppApiKey: "",
      whatsAppPhoneNumberId: "",
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioPhoneNumber: "",
      voiceWebhookUrl: "",
      whatsappWebhook: "",
    },
    deliveryPartners: {
      primary: "",
      priority: [],
      partnerCredentials: {},
    },
    apiKeys: {},
  };
}

let cachedConfig: AppConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getAppConfig(forceRefresh = false): Promise<AppConfig> {
  if (!forceRefresh && cachedConfig && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as AppConfig;
      cachedConfig = data;
      cacheTimestamp = Date.now();
      return data;
    }
    const defaults = getDefaultConfig();
    await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID), { ...defaults, updatedAt: serverTimestamp() });
    cachedConfig = defaults;
    cacheTimestamp = Date.now();
    return defaults;
  } catch (err) {
    if (cachedConfig) return cachedConfig;
    return getDefaultConfig();
  }
}

export async function updateAppConfig(updates: Partial<AppConfig>): Promise<void> {
  await updateDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID), { ...updates, updatedAt: serverTimestamp() });
  cachedConfig = null;
}

export async function seedDefaultConfig(): Promise<AppConfig> {
  const defaults = getDefaultConfig();
  await setDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID), { ...defaults, updatedAt: serverTimestamp() });
  cachedConfig = defaults;
  return defaults;
}

export function clearAppConfigCache() {
  cachedConfig = null;
  cacheTimestamp = 0;
}
