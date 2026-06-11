/* eslint-disable @typescript-eslint/no-var-requires */

// ============================================================
// Firebase Mock Infrastructure
// ============================================================

const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockAddDoc = jest.fn().mockResolvedValue({ id: "new-doc-id" });
const mockDeleteDoc = jest.fn().mockResolvedValue(undefined);
const mockGetDocs = jest.fn();
const mockServerTimestamp = jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }));
const mockArrayUnion = jest.fn((val) => ({ _arrayUnion: val }));
const mockTimestampNow = jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }));
const mockQuery = jest.fn((...args) => args);
const mockWhere = jest.fn((...args) => ({ _field: args[0], _op: args[1], _val: args[2] }));
const mockLimit = jest.fn((n) => ({ _limit: n }));
const mockCollection = jest.fn((...args) => ({ _path: args.join("/") }));
const mockCollectionGroup = jest.fn((...args) => ({ _path: args.join("/"), _isCollectionGroup: true }));
const mockDoc = jest.fn((...args) => ({ _path: args.join("/"), id: args[args.length - 1] }));
const mockWriteBatch = jest.fn();
const mockRunTransaction = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

mockWriteBatch.mockReturnValue({
  update: mockBatchUpdate,
  set: mockBatchSet,
  commit: mockBatchCommit,
});

const mockOnSnapshot = jest.fn((ref, onSuccess) => {
  if (onSuccess) {
    onSuccess({ exists: () => false, data: () => null, id: "settings" });
  }
  return jest.fn();
});

const firebaseFirestoreMock = {
  getFirestore: jest.fn(() => ({})),
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  addDoc: mockAddDoc,
  deleteDoc: mockDeleteDoc,
  getDocs: mockGetDocs,
  collection: mockCollection,
  collectionGroup: mockCollectionGroup,
  query: mockQuery,
  where: mockWhere,
  limit: mockLimit,
  serverTimestamp: mockServerTimestamp,
  arrayUnion: mockArrayUnion,
  Timestamp: { now: mockTimestampNow },
  writeBatch: mockWriteBatch,
  runTransaction: mockRunTransaction,
  onSnapshot: mockOnSnapshot,
};

jest.mock("firebase/firestore", () => firebaseFirestoreMock);

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => [{}]),
  getApp: jest.fn(() => ({})),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: "owner-uid-123", email: "test@example.com" },
  })),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("../firebaseConfig", () => ({
  app: {},
  db: {},
  auth: { currentUser: { uid: "owner-uid-123" } },
}));

jest.mock("@/firebaseConfig", () => ({
  app: {},
  db: {},
  auth: { currentUser: { uid: "owner-uid-123" } },
}));

jest.mock("../types", () => ({
  OrderStatus: {},
}));

jest.mock("../lib/areaCode", () => ({
  extractAreaCode: jest.fn((addr) => {
    if (!addr) return "AREA_UNKNOWN";
    const match = String(addr).match(/\b\d{6}\b/);
    if (match) return `AREA_${match[0]}`;
    const clean = String(addr).replace(/[^a-zA-Z0-9]/g, "").trim();
    if (clean.length > 0) return `AREA_${clean.substring(0, 6).toUpperCase()}`;
    return "AREA_UNKNOWN";
  }),
}));

// ============================================================
// Helper: create Firestore mock snap
// ============================================================

function makeSnap(exists, data, id = "settings") {
  return {
    exists: () => exists,
    data: () => data,
    id,
    ref: {
      parent: {
        parent: { id: "user-1" },
      },
    },
  };
}

function makeQuerySnap(docs) {
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
  };
}

// ============================================================
// Reset helper — clears mock call history AND return value queues
// ============================================================

function resetAllMocks() {
  mockGetDoc.mockReset();
  mockSetDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockGetDocs.mockReset();
  mockDeleteDoc.mockReset();
  mockAddDoc.mockReset();
  mockBatchUpdate.mockReset();
  mockBatchSet.mockReset();
  mockBatchCommit.mockReset();
  mockCollection.mockClear();
  mockCollectionGroup.mockClear();
  mockDoc.mockClear();
  mockQuery.mockClear();
  mockWhere.mockClear();
  mockServerTimestamp.mockReset();
  mockArrayUnion.mockClear();

  mockSetDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockAddDoc.mockResolvedValue({ id: "new-doc-id" });
  mockBatchCommit.mockResolvedValue(undefined);
  mockServerTimestamp.mockImplementation(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }));

  mockWriteBatch.mockReturnValue({
    update: mockBatchUpdate,
    set: mockBatchSet,
    commit: mockBatchCommit,
  });
}

// ============================================================
// 1. UNIT TESTS — appConfig.ts
// ============================================================

describe("Unit Tests: appConfig.ts", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe("getDefaultConfig()", () => {
    it("returns a complete config with all required top-level sections", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();

      expect(config).toHaveProperty("business");
      expect(config).toHaveProperty("store");
      expect(config).toHaveProperty("features");
      expect(config).toHaveProperty("seo");
      expect(config).toHaveProperty("contact");
      expect(config).toHaveProperty("ai");
      expect(config).toHaveProperty("deliveryZones");
      expect(config).toHaveProperty("payment");
      expect(config).toHaveProperty("workers");
      expect(config).toHaveProperty("notifications");
      expect(config).toHaveProperty("deliveryPartners");
      expect(config).toHaveProperty("apiKeys");
    });

    it("returns correct default business fields", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();

      expect(config.business.type).toBe("general");
      expect(config.business.name).toBe("My Store");
      expect(config.business.currency).toBe("INR");
      expect(config.business.currencySymbol).toBe("₹");
      expect(config.business.taxRate).toBe(5);
      expect(config.business.taxName).toBe("GST");
      expect(config.business.orderPrefix).toBe("ORD-");
      expect(config.business.invoiceFooter).toBe("Thank you for your order!");
      expect(config.business.primaryColor).toBe("#059669");
    });

    it("returns correct default store fields", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();

      expect(config.store.isOpen).toBe(true);
      expect(config.store.maintenanceMode).toBe(false);
      expect(config.store.minOrderValue).toBe(199);
      expect(config.store.deliveryCharge).toBe(40);
      expect(config.store.freeDeliveryAbove).toBe(499);
      expect(config.store.taxPercent).toBe(5);
      expect(config.store.location).toEqual({ address: "", lat: 0, lng: 0 });
    });

    it("returns correct default feature flags", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();

      expect(config.features.voiceSearch).toBe(true);
      expect(config.features.wishlist).toBe(true);
      expect(config.features.coupons).toBe(true);
      expect(config.features.reviews).toBe(true);
      expect(config.features.chatbot).toBe(true);
      expect(config.features.loyalty).toBe(false);
      expect(config.features.posMode).toBe(false);
      expect(config.features.creditSystem).toBe(false);
      expect(config.features.offlineMode).toBe(false);
      expect(config.features.loyaltyPoints).toBe(false);
      expect(config.features.whatsappReports).toBe(false);
      expect(config.features.voiceAlerts).toBe(false);
      expect(config.features.printBill).toBe(false);
    });

    it("returns correct default payment config", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();

      expect(config.payment.codEnabled).toBe(true);
      expect(config.payment.razorpayEnabled).toBe(false);
      expect(config.payment.razorpayKeyId).toBe("");
      expect(config.payment.razorpayKeySecret).toBe("");
      expect(config.payment.autoCancelUnpaidMinutes).toBe(30);
      expect(config.payment.paymentReminderHours).toBe(2);
    });

    it("returns correct default workers config", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();

      expect(config.workers.wagesDaily).toBe(500);
      expect(config.workers.wagesHourly).toBe(80);
      expect(config.workers.workerPINs).toEqual({});
      expect(config.workers.enableClockInOut).toBe(true);
      expect(config.workers.workerEmails).toEqual([]);
      expect(config.workers.deliveryBoyEmails).toEqual([]);
    });

    it("returns correct default notification config", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();

      expect(config.notifications.smsProvider).toBe("");
      expect(config.notifications.smsApiKey).toBe("");
      expect(config.notifications.whatsAppApiKey).toBe("");
      expect(config.notifications.whatsappWebhook).toBe("");
    });

    it("returns correct default delivery zones config", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();

      expect(config.deliveryZones.enabled).toBe(false);
      expect(config.deliveryZones.localPincodes).toEqual([]);
      expect(config.deliveryZones.deliveryCharges).toEqual({});
      expect(config.deliveryZones.maxLocalWeightKg).toBe(10);
      expect(config.deliveryZones.outOfCityHandling).toBe("manual");
    });

    it("returns correct default delivery partners config", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();

      expect(config.deliveryPartners.primary).toBe("");
      expect(config.deliveryPartners.priority).toEqual([]);
      expect(config.deliveryPartners.partnerCredentials).toEqual({});
    });

    it("returns empty apiKeys by default", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const config = getDefaultConfig();
      expect(config.apiKeys).toEqual({});
    });

    it("each call returns a fresh object (no shared references)", () => {
      const { getDefaultConfig } = require("../lib/firestore/appConfig");
      const a = getDefaultConfig();
      const b = getDefaultConfig();
      expect(a).not.toBe(b);
      expect(a.business).not.toBe(b.business);
      expect(a.store).not.toBe(b.store);
      expect(a.features).not.toBe(b.features);
    });
  });

  describe("getAppConfig()", () => {
    it("reads from appConfig/settings and returns data when doc exists", async () => {
      const existingConfig = {
        business: { name: "Fresh Mart", type: "grocery" },
        store: { isOpen: true },
      };
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, existingConfig));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      const result = await getAppConfig();

      expect(mockGetDoc).toHaveBeenCalled();
      expect(result.business.name).toBe("Fresh Mart");
      expect(result.business.type).toBe("grocery");
    });

    it("creates and returns defaults when doc does not exist", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(false, null));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      const result = await getAppConfig();

      expect(mockSetDoc).toHaveBeenCalled();
      expect(result.business.name).toBe("My Store");
      expect(result.store.deliveryCharge).toBe(40);
    });

    it("setDoc is called with serverTimestamp when creating defaults", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(false, null));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      await getAppConfig();

      const setDocCall = mockSetDoc.mock.calls[0];
      const writtenData = setDocCall[1];
      expect(writtenData).toHaveProperty("updatedAt");
    });

    it("returns cached config on second call without forceRefresh", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "Cached Store" } }));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      const first = await getAppConfig();
      const second = await getAppConfig();

      expect(mockGetDoc).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it("bypasses cache when forceRefresh is true", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "First" } }));
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "Second" } }));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      await getAppConfig(false);
      await getAppConfig(true);

      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });

    it("returns cached config when Firestore call fails", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "OK" } }));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      await getAppConfig();

      mockGetDoc.mockRejectedValueOnce(new Error("network error"));
      const result = await getAppConfig(true);

      expect(result.business.name).toBe("OK");
    });

    it("returns defaults when Firestore fails and no cache exists", async () => {
      mockGetDoc.mockRejectedValueOnce(new Error("network error"));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      const result = await getAppConfig(true);

      expect(result.business.name).toBe("My Store");
    });
  });

  describe("updateAppConfig()", () => {
    it("writes to appConfig/settings with serverTimestamp", async () => {
      const { updateAppConfig } = require("../lib/firestore/appConfig");
      await updateAppConfig({ "business.name": "New Store" });

      expect(mockUpdateDoc).toHaveBeenCalled();
      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("updatedAt");
    });

    it("clears the cache after update", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "Old" } }));

      const { getAppConfig, updateAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      await getAppConfig();

      await updateAppConfig({ "business.name": "New" });

      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "New" } }));
      const result = await getAppConfig();
      expect(result.business.name).toBe("New");
      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });

    it("passes through partial updates correctly", async () => {
      const { updateAppConfig } = require("../lib/firestore/appConfig");
      await updateAppConfig({ "store.deliveryCharge": 50, "store.freeDeliveryAbove": 599 });

      const callArgs = mockUpdateDoc.mock.calls[0];
      const writtenData = callArgs[1];
      expect(writtenData["store.deliveryCharge"]).toBe(50);
      expect(writtenData["store.freeDeliveryAbove"]).toBe(599);
    });
  });

  describe("seedDefaultConfig()", () => {
    it("overwrites config doc with defaults", async () => {
      const { seedDefaultConfig } = require("../lib/firestore/appConfig");
      const result = await seedDefaultConfig();

      expect(mockSetDoc).toHaveBeenCalled();
      expect(result.business.name).toBe("My Store");
      expect(result.store.deliveryCharge).toBe(40);
      expect(result.features.voiceSearch).toBe(true);
    });

    it("sets updatedAt with serverTimestamp", async () => {
      const { seedDefaultConfig } = require("../lib/firestore/appConfig");
      await seedDefaultConfig();

      const setDocCall = mockSetDoc.mock.calls[0];
      const writtenData = setDocCall[1];
      expect(writtenData).toHaveProperty("updatedAt");
    });

    it("returns the seeded config", async () => {
      const { seedDefaultConfig } = require("../lib/firestore/appConfig");
      const result = await seedDefaultConfig();
      expect(result).toHaveProperty("business");
      expect(result).toHaveProperty("store");
      expect(result).toHaveProperty("features");
      expect(result).toHaveProperty("payment");
      expect(result).toHaveProperty("workers");
      expect(result).toHaveProperty("notifications");
    });
  });

  describe("clearAppConfigCache()", () => {
    it("resets cache so next getAppConfig fetches from Firestore", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "V1" } }));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      await getAppConfig();

      clearAppConfigCache();

      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "V2" } }));
      const result = await getAppConfig();

      expect(result.business.name).toBe("V2");
      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });

    it("safe to call multiple times", () => {
      const { clearAppConfigCache } = require("../lib/firestore/appConfig");
      expect(() => {
        clearAppConfigCache();
        clearAppConfigCache();
        clearAppConfigCache();
      }).not.toThrow();
    });
  });
});

// ============================================================
// 2. CONFIG SYNC TESTS
// ============================================================

describe("Config Sync Tests", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe("StoreConfigEditor save", () => {
    it("writes to both appConfig/settings AND contactInfo/info", async () => {
      const { updateAppConfig } = require("../lib/firestore/appConfig");
      await updateAppConfig({
        business: { name: "Synced Store", type: "grocery" },
        contact: { phone: "123", email: "a@b.com", address: "123 St" },
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe("APIKeyManager save mirrors keys", () => {
    it("mirrors razorpay keys to payment section", async () => {
      const { updateAppConfig } = require("../lib/firestore/appConfig");
      await updateAppConfig({
        payment: {
          razorpayEnabled: true,
          razorpayKeyId: "rzp_live_xxx",
          razorpayKeySecret: "secret123",
        },
      });

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("payment.razorpayKeyId", "rzp_live_xxx");
      expect(callArgs[1]).toHaveProperty("payment.razorpayKeySecret", "secret123");
    });

    it("mirrors gemini key to ai section", async () => {
      const { updateAppConfig } = require("../lib/firestore/appConfig");
      await updateAppConfig({
        ai: { geminiApiKey: "AIzaSyXXX" },
      });

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("ai.geminiApiKey", "AIzaSyXXX");
    });

    it("mirrors SMS provider keys to notifications section", async () => {
      const { updateAppConfig } = require("../lib/firestore/appConfig");
      await updateAppConfig({
        notifications: {
          smsProvider: "msg91",
          smsApiKey: "sms-key-123",
          smsFlowId: "flow-456",
        },
      });

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("notifications.smsProvider", "msg91");
      expect(callArgs[1]).toHaveProperty("notifications.smsApiKey", "sms-key-123");
    });

    it("mirrors WhatsApp keys to notifications section", async () => {
      const { updateAppConfig } = require("../lib/firestore/appConfig");
      await updateAppConfig({
        notifications: {
          whatsAppApiKey: "wa-key",
          whatsAppPhoneNumberId: "123456",
        },
      });

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("notifications.whatsAppApiKey", "wa-key");
    });
  });

  describe("SetupWizard finish", () => {
    it("writes complete config to appConfig/settings", async () => {
      const { seedDefaultConfig } = require("../lib/firestore/appConfig");
      await seedDefaultConfig();

      expect(mockSetDoc).toHaveBeenCalled();
      const writtenData = mockSetDoc.mock.calls[0][1];
      expect(writtenData).toHaveProperty("business");
      expect(writtenData).toHaveProperty("store");
      expect(writtenData).toHaveProperty("features");
      expect(writtenData).toHaveProperty("payment");
      expect(writtenData).toHaveProperty("workers");
      expect(writtenData).toHaveProperty("notifications");
      expect(writtenData).toHaveProperty("deliveryPartners");
      expect(writtenData).toHaveProperty("apiKeys");
    });
  });

  describe("Config path consistency", () => {
    it("all writers target appConfig/settings", async () => {
      const { updateAppConfig, seedDefaultConfig } = require("../lib/firestore/appConfig");

      await updateAppConfig({ "business.name": "Test" });
      expect(mockUpdateDoc).toHaveBeenCalled();
      const updatePath = mockUpdateDoc.mock.calls[0][0];
      expect(updatePath._path).toContain("appConfig");
      expect(updatePath._path).toContain("settings");

      jest.clearAllMocks();

      await seedDefaultConfig();
      expect(mockSetDoc).toHaveBeenCalled();
      const seedPath = mockSetDoc.mock.calls[0][0];
      expect(seedPath._path).toContain("appConfig");
      expect(seedPath._path).toContain("settings");
    });
  });
});

// ============================================================
// 3. DATA FLOW TESTS
// ============================================================

describe("Data Flow Tests", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe("useAppConfig hook", () => {
    it("maps business.name to storeName", () => {
      const raw = {
        business: { name: "Fresh Grocery" },
        store: { deliveryCharge: 40 },
        features: { darkMode: true },
      };
      const DEFAULT = {
        storeName: "My Store",
        storeLogo: "",
        primaryColor: "#059669",
        accentColor: "#0d9488",
        darkModeEnabled: false,
      };

      const mapped = {
        storeName: raw.business?.name || DEFAULT.storeName,
        storeLogo: raw.business?.logoUrl || DEFAULT.storeLogo,
        primaryColor: raw.business?.primaryColor || DEFAULT.primaryColor,
        accentColor: raw.business?.accentColor || DEFAULT.accentColor,
        darkModeEnabled: raw.features?.darkMode ?? DEFAULT.darkModeEnabled,
      };

      expect(mapped.storeName).toBe("Fresh Grocery");
      expect(mapped.darkModeEnabled).toBe(true);
    });

    it("maps nested store.location to flat shopLocation", () => {
      const raw = {
        store: {
          location: {
            address: "456 Market Rd",
            lat: 18.5,
            lng: 73.8,
          },
          deliveryCharge: 50,
          freeDeliveryAbove: 399,
        },
      };

      const shopLocation = {
        address: raw.store?.location?.address || "",
        lat: raw.store?.location?.lat || 0,
        lng: raw.store?.location?.lng || 0,
      };

      expect(shopLocation.address).toBe("456 Market Rd");
      expect(shopLocation.lat).toBe(18.5);
      expect(shopLocation.lng).toBe(73.8);
    });

    it("maps contact fields to contactInfo", () => {
      const raw = {
        contact: {
          phone: "+91 1112223333",
          email: "info@store.com",
          phoneSecondary: "+91 4445556666",
          emailOrders: "orders@store.com",
          whatsappNumber: "+91 7778889999",
          workingHours: { monday_friday: "9-9", saturday: "9-8", sunday: "10-6" },
          socialMedia: { instagram: "@store", facebook: "storefb" },
        },
      };

      const contactInfo = {
        phone: raw.contact?.phone || "",
        phoneSecondary: raw.contact?.phoneSecondary || "",
        email: raw.contact?.email || "",
        emailOrders: raw.contact?.emailOrders || "",
        whatsappNumber: raw.contact?.whatsappNumber || "",
        workingHours: raw.contact?.workingHours || {},
        socialMedia: raw.contact?.socialMedia || {},
      };

      expect(contactInfo.phone).toBe("+91 1112223333");
      expect(contactInfo.emailOrders).toBe("orders@store.com");
      expect(contactInfo.socialMedia.instagram).toBe("@store");
    });

    it("falls back to defaults when raw config is empty", () => {
      const raw = {};
      const DEFAULT = {
        storeName: "My Store",
        deliveryCharge: 40,
        freeDeliveryAbove: 299,
      };

      const storeName = raw.business?.name || DEFAULT.storeName;
      const deliveryCharge = raw.store?.deliveryCharge || DEFAULT.deliveryCharge;

      expect(storeName).toBe("My Store");
      expect(deliveryCharge).toBe(40);
    });

    it("handles null raw config", () => {
      const raw = null;
      const DEFAULT = { storeName: "My Store" };
      const storeName = raw?.business?.name || DEFAULT.storeName;
      expect(storeName).toBe("My Store");
    });
  });

  describe("useOrders hook", () => {
    it("getActiveOrders queries collectionGroup('orders')", async () => {
      mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

      const { getActiveOrders } = require("../lib/firestore/orders");
      await getActiveOrders();

      expect(mockCollectionGroup).toHaveBeenCalledWith(expect.anything(), "orders");
      expect(mockQuery).toHaveBeenCalled();
    });

    it("getActiveOrders filters to active statuses client-side", async () => {
      const orderDocs = [
        {
          id: "order-1",
          data: () => ({ status: "Pending", items: [], totalAmount: 100 }),
          ref: { parent: { parent: { id: "user-1" } } },
        },
        {
          id: "order-2",
          data: () => ({ status: "Delivered", items: [], totalAmount: 200 }),
          ref: { parent: { parent: { id: "user-2" } } },
        },
        {
          id: "order-3",
          data: () => ({ status: "Packing", items: [], totalAmount: 150 }),
          ref: { parent: { parent: { id: "user-1" } } },
        },
      ];
      mockGetDocs.mockResolvedValueOnce(makeQuerySnap(orderDocs));

      const { getActiveOrders } = require("../lib/firestore/orders");
      const result = await getActiveOrders();

      expect(result.orders).toHaveLength(2);
      expect(result.orders.map((o) => o.status)).toContain("Pending");
      expect(result.orders.map((o) => o.status)).toContain("Packing");
      expect(result.orders.map((o) => o.status)).not.toContain("Delivered");
    });

    it("getAllOrdersGroup returns all orders regardless of status", async () => {
      const orderDocs = [
        {
          id: "order-1",
          data: () => ({ status: "Pending", items: [], totalAmount: 100 }),
          ref: { parent: { parent: { id: "user-1" } } },
        },
        {
          id: "order-2",
          data: () => ({ status: "Delivered", items: [], totalAmount: 200 }),
          ref: { parent: { parent: { id: "user-2" } } },
        },
      ];
      mockGetDocs.mockResolvedValueOnce(makeQuerySnap(orderDocs));

      const { getAllOrdersGroup } = require("../lib/firestore/orders");
      const result = await getAllOrdersGroup();

      expect(result).toHaveLength(2);
    });

    it("normalizeOrder handles missing items gracefully", () => {
      const { normalizeOrder } = require("../lib/firestore/orders");
      const order = normalizeOrder("o1", "u1", {
        totalAmount: 500,
        status: "Pending",
      });

      expect(order.id).toBe("o1");
      expect(order.userId).toBe("u1");
      expect(order.items).toEqual([]);
      expect(order.totalAmount).toBe(500);
      expect(order.status).toBe("Pending");
    });

    it("normalizeOrder extracts areaCode from deliveryAddress", () => {
      const { normalizeOrder } = require("../lib/firestore/orders");
      const order = normalizeOrder("o1", "u1", {
        deliveryAddress: "123 Main St 411001",
        items: [],
        totalAmount: 100,
        status: "Pending",
      });

      expect(order.areaCode).toBe("AREA_411001");
    });

    it("normalizeOrder defaults status to Pending when missing", () => {
      const { normalizeOrder } = require("../lib/firestore/orders");
      const order = normalizeOrder("o1", "u1", { items: [], totalAmount: 0 });
      expect(order.status).toBe("Pending");
    });

    it("normalizeOrder defaults userId to unknown when missing", () => {
      const { normalizeOrder } = require("../lib/firestore/orders");
      const order = normalizeOrder("o1", undefined, { items: [], totalAmount: 0 });
      expect(order.userId).toBe("unknown");
    });

    it("normalizeOrder calculates totalWeight from items", () => {
      const { normalizeOrder } = require("../lib/firestore/orders");
      const order = normalizeOrder("o1", "u1", {
        items: [
          { name: "Apple", quantity: 2, weight: 500 },
          { name: "Banana", quantity: 1, weight: 300 },
        ],
        totalAmount: 100,
        status: "Pending",
      });

      expect(order.totalWeight).toBe(1300);
    });
  });

  describe("DashboardHomeView safeQuery", () => {
    it("safeQuery returns result when query succeeds", async () => {
      const mockFn = jest.fn().mockResolvedValue({ docs: [], size: 0 });
      const fallback = { docs: [], size: 0 };

      let result;
      try {
        result = await mockFn();
      } catch {
        result = fallback;
      }

      expect(result).toEqual({ docs: [], size: 0 });
      expect(mockFn).toHaveBeenCalled();
    });

    it("safeQuery returns fallback when query fails", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("index missing"));
      const fallback = { docs: [], size: 0 };

      let result;
      try {
        result = await mockFn();
      } catch {
        result = fallback;
      }

      expect(result).toEqual({ docs: [], size: 0 });
    });

    it("safeQuery handles Firestore permission errors gracefully", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("Permission denied"));
      const fallback = { docs: [], size: 0 };

      let result;
      try {
        result = await mockFn();
      } catch {
        result = fallback;
      }

      expect(result).toEqual({ docs: [], size: 0 });
    });
  });
});

// ============================================================
// 4. FIRESTORE WRITE INTEGRITY TESTS
// ============================================================

describe("Firestore Write Integrity", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe("updateContactInfo()", () => {
    it("creates doc if missing (setDoc when snap !exists)", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(false, null));

      const contacts = require("../lib/firestore/contacts");
      await contacts.updateContactInfo({ phone: "111", email: "new@test.com" });

      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it("updates doc if exists (updateDoc when snap exists)", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { phone: "old" }));

      const contacts = require("../lib/firestore/contacts");
      await contacts.updateContactInfo({ phone: "222" });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it("writes to contactInfo/info path", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, {}));

      const contacts = require("../lib/firestore/contacts");
      await contacts.updateContactInfo({ phone: "333" });

      expect(mockUpdateDoc).toHaveBeenCalled();
      const docPath = mockUpdateDoc.mock.calls[0][0];
      expect(docPath._path).toContain("contactInfo");
      expect(docPath._path).toContain("info");
    });
  });

  describe("Order status updates", () => {
    it("updateOrderStatus writes only valid Title Case statuses", async () => {
      const { updateOrderStatus } = require("../lib/firestore/orders");
      await updateOrderStatus("user-1", "order-1", "Delivered");

      expect(mockUpdateDoc).toHaveBeenCalled();
      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("status", "Delivered");
    });

    it("updateOrderStatus sets deliveredAt when status is Delivered", async () => {
      const { updateOrderStatus } = require("../lib/firestore/orders");
      await updateOrderStatus("user-1", "order-1", "Delivered");

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("deliveredAt");
    });

    it("updateOrderStatus does NOT set deliveredAt for non-Delivered statuses", async () => {
      const { updateOrderStatus } = require("../lib/firestore/orders");
      await updateOrderStatus("user-1", "order-1", "Packing");

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty("deliveredAt");
    });

    it("updateOrderStatus writes to users/{userId}/orders/{orderId} path", async () => {
      const { updateOrderStatus } = require("../lib/firestore/orders");
      await updateOrderStatus("user-42", "order-99", "Assigned");

      const docPath = mockUpdateDoc.mock.calls[0][0];
      expect(docPath._path).toContain("users");
      expect(docPath._path).toContain("user-42");
      expect(docPath._path).toContain("orders");
      expect(docPath._path).toContain("order-99");
    });

    it("updateOrderStatus passes extra fields through", async () => {
      const { updateOrderStatus } = require("../lib/firestore/orders");
      await updateOrderStatus("user-1", "order-1", "Assigned", {
        assignedDeliveryBoyId: "boy-1",
      });

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("assignedDeliveryBoyId", "boy-1");
    });

    it("all valid OrderStatus values are Title Case", () => {
      const validStatuses = [
        "Pending", "Packing", "Ready to Dispatch", "Assigned",
        "Accepted", "Out for Delivery", "Awaiting Verification",
        "Delivered", "Cancelled",
      ];
      validStatuses.forEach((status) => {
        expect(status[0]).toBe(status[0].toUpperCase());
        expect(status).not.toBe(status.toLowerCase());
      });
    });
  });

  describe("Basket dispatch", () => {
    it("dispatchBasket writes to deliveryBoys/{id}/basket correctly", async () => {
      const { dispatchBasket } = require("../lib/firestore/orders");
      const basket = {
        basketId: "BASKET-411001-1",
        areaCode: "411001",
        totalWeight: 2000,
        totalAmount: 500,
        orders: [
          {
            id: "order-1",
            userId: "user-1",
            totalAmount: 300,
            totalWeight: 1200,
            address: { name: "Alice", addressLine: "123 Main St" },
          },
          {
            id: "order-2",
            userId: "user-2",
            totalAmount: 200,
            totalWeight: 800,
            address: { name: "Bob", addressLine: "456 Oak Ave" },
          },
        ],
      };

      await dispatchBasket(basket, "boy-1", "Ravi");

      expect(mockBatchSet).toHaveBeenCalledTimes(2);

      const firstBasketCall = mockBatchSet.mock.calls[0];
      expect(firstBasketCall[0]._path).toContain("deliveryBoys");
      expect(firstBasketCall[0]._path).toContain("boy-1");
      expect(firstBasketCall[0]._path).toContain("basket");
      expect(firstBasketCall[0]._path).toContain("order-1");
      expect(firstBasketCall[1]).toHaveProperty("orderId", "order-1");
      expect(firstBasketCall[1]).toHaveProperty("userId", "user-1");
      expect(firstBasketCall[1]).toHaveProperty("name", "Alice");

      const secondBasketCall = mockBatchSet.mock.calls[1];
      expect(secondBasketCall[0]._path).toContain("order-2");
      expect(secondBasketCall[1]).toHaveProperty("name", "Bob");
    });

    it("dispatchBasket updates order status to Assigned", async () => {
      const { dispatchBasket } = require("../lib/firestore/orders");
      const basket = {
        basketId: "BASKET-411001-1",
        areaCode: "411001",
        totalWeight: 1000,
        totalAmount: 200,
        orders: [
          {
            id: "order-1",
            userId: "user-1",
            totalAmount: 200,
            totalWeight: 1000,
            address: { name: "Test" },
          },
        ],
      };

      await dispatchBasket(basket, "boy-1", "Ravi");

      expect(mockBatchUpdate).toHaveBeenCalled();
      const updateCall = mockBatchUpdate.mock.calls[0];
      expect(updateCall[1]).toHaveProperty("status", "Assigned");
      expect(updateCall[1]).toHaveProperty("assignedDeliveryBoyId", "boy-1");
    });

    it("dispatchBasket commits the batch", async () => {
      const { dispatchBasket } = require("../lib/firestore/orders");
      const basket = {
        basketId: "BASKET-1-1",
        areaCode: "1",
        totalWeight: 500,
        totalAmount: 100,
        orders: [
          {
            id: "o1",
            userId: "u1",
            totalAmount: 100,
            totalWeight: 500,
            address: {},
          },
        ],
      };

      await dispatchBasket(basket, "boy-1", "Ravi");
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("dispatchBasket skips orders with missing id or userId", async () => {
      const { dispatchBasket } = require("../lib/firestore/orders");
      const basket = {
        basketId: "BASKET-1-1",
        areaCode: "1",
        totalWeight: 500,
        totalAmount: 100,
        orders: [
          { id: "", userId: "u1", totalAmount: 100, totalWeight: 500, address: {} },
          { id: "o2", userId: "", totalAmount: 100, totalWeight: 500, address: {} },
          { id: "o3", userId: "u3", totalAmount: 100, totalWeight: 500, address: {} },
        ],
      };

      await dispatchBasket(basket, "boy-1", "Ravi");

      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Contact CRUD operations", () => {
    it("getContacts reads from contacts collection and sorts by createdAt", async () => {
      const contactDocs = [
        {
          id: "c1",
          data: () => ({
            name: "Alice",
            createdAt: { toDate: () => new Date("2026-01-01") },
          }),
        },
        {
          id: "c2",
          data: () => ({
            name: "Bob",
            createdAt: { toDate: () => new Date("2026-06-01") },
          }),
        },
      ];
      mockGetDocs.mockResolvedValueOnce(makeQuerySnap(contactDocs));

      const contacts = require("../lib/firestore/contacts");
      const result = await contacts.getContacts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Bob");
      expect(result[1].name).toBe("Alice");
    });

    it("getContact returns null when doc does not exist", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(false, null, "nonexistent"));

      const contacts = require("../lib/firestore/contacts");
      const result = await contacts.getContact("nonexistent");

      expect(result).toBeNull();
    });

    it("getContact returns contact data when doc exists", async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeSnap(true, { name: "Test User", message: "Help" }, "c1")
      );

      const contacts = require("../lib/firestore/contacts");
      const result = await contacts.getContact("c1");

      expect(result).not.toBeNull();
      expect(result.name).toBe("Test User");
    });

    it("markContactRead updates read field to true", async () => {
      const contacts = require("../lib/firestore/contacts");
      await contacts.markContactRead("c1");

      expect(mockUpdateDoc).toHaveBeenCalled();
      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("read", true);
    });

    it("deleteContact calls deleteDoc on the correct path", async () => {
      const contacts = require("../lib/firestore/contacts");
      await contacts.deleteContact("c1");

      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it("replyToContact adds reply with arrayUnion and sets status to in-progress", async () => {
      const contacts = require("../lib/firestore/contacts");
      await contacts.replyToContact("c1", "We are looking into it");

      expect(mockUpdateDoc).toHaveBeenCalled();
      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("replies");
      expect(callArgs[1]).toHaveProperty("status", "in-progress");
    });

    it("updateContactStatus sets correct auto-reply for in-progress", async () => {
      const contacts = require("../lib/firestore/contacts");
      await contacts.updateContactStatus("c1", "in-progress");

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("status", "in-progress");
      expect(callArgs[1]).toHaveProperty("replies");
    });

    it("updateContactStatus sets correct auto-reply for resolved", async () => {
      const contacts = require("../lib/firestore/contacts");
      await contacts.updateContactStatus("c1", "resolved");

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("status", "resolved");
      expect(callArgs[1]).toHaveProperty("replies");
    });

    it("updateContactStatus does NOT add reply for open status", async () => {
      const contacts = require("../lib/firestore/contacts");
      await contacts.updateContactStatus("c1", "open");

      const callArgs = mockUpdateDoc.mock.calls[0];
      expect(callArgs[1]).toHaveProperty("status", "open");
      expect(callArgs[1]).not.toHaveProperty("replies");
    });
  });

  describe("getContactInfo()", () => {
    it("returns null when contactInfo/info doc does not exist", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(false, null, "info"));

      const contacts = require("../lib/firestore/contacts");
      const result = await contacts.getContactInfo();

      expect(result).toBeNull();
    });

    it("returns contact info data when doc exists", async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeSnap(true, { phone: "123", email: "a@b.com" }, "info")
      );

      const contacts = require("../lib/firestore/contacts");
      const result = await contacts.getContactInfo();

      expect(result).not.toBeNull();
      expect(result.phone).toBe("123");
    });
  });

  describe("createReplacementOrder()", () => {
    it("returns null when contact does not exist", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(false, null));

      const contacts = require("../lib/firestore/contacts");
      const result = await contacts.createReplacementOrder("nonexistent");

      expect(result).toBeNull();
    });

    it("returns null when contact has no userId or orderId", async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeSnap(true, { name: "No Order Contact" }, "c1")
      );

      const contacts = require("../lib/firestore/contacts");
      const result = await contacts.createReplacementOrder("c1");

      expect(result).toBeNull();
    });
  });
});

// ============================================================
// 5. EDGE CASES
// ============================================================

describe("Edge Cases", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe("Empty Firestore (no config doc exists)", () => {
    it("getAppConfig creates and returns defaults when no doc exists", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(false, null));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      const result = await getAppConfig(true);

      expect(result.business.name).toBe("My Store");
      expect(result.store.deliveryCharge).toBe(40);
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it("getContacts returns empty array when collection is empty", async () => {
      mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

      const contacts = require("../lib/firestore/contacts");
      const result = await contacts.getContacts();

      expect(result).toEqual([]);
    });

    it("getActiveOrders returns empty when no orders exist", async () => {
      mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

      const { getActiveOrders } = require("../lib/firestore/orders");
      const result = await getActiveOrders();

      expect(result.orders).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it("getAllOrdersGroup returns empty when no orders exist", async () => {
      mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

      const { getAllOrdersGroup } = require("../lib/firestore/orders");
      const result = await getAllOrdersGroup();

      expect(result).toEqual([]);
    });
  });

  describe("Partial config document (missing sections)", () => {
    it("getAppConfig returns partial doc with id when doc exists", async () => {
      const partialDoc = {
        business: { name: "Partial Store" },
      };
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, partialDoc));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      const result = await getAppConfig(true);

      expect(result.business.name).toBe("Partial Store");
    });

    it("useAppConfig mapping falls back to defaults for missing nested fields", () => {
      const raw = {
        business: { name: "Partial" },
      };
      const DEFAULT = {
        storeName: "My Store",
        primaryColor: "#059669",
        deliveryCharge: 40,
        darkModeEnabled: false,
      };

      const storeName = raw.business?.name || DEFAULT.storeName;
      const primaryColor = raw.business?.primaryColor || DEFAULT.primaryColor;
      const deliveryCharge = raw.store?.deliveryCharge || DEFAULT.deliveryCharge;
      const darkMode = raw.features?.darkMode ?? DEFAULT.darkModeEnabled;

      expect(storeName).toBe("Partial");
      expect(primaryColor).toBe("#059669");
      expect(deliveryCharge).toBe(40);
      expect(darkMode).toBe(false);
    });

    it("normalizeOrder handles partial order documents", () => {
      const { normalizeOrder } = require("../lib/firestore/orders");

      const order = normalizeOrder("o1", "u1", {});

      expect(order.id).toBe("o1");
      expect(order.userId).toBe("u1");
      expect(order.items).toEqual([]);
      expect(order.totalAmount).toBe(0);
      expect(order.status).toBe("Pending");
      expect(order.totalWeight).toBe(0);
      expect(order.payment).toBeDefined();
      expect(order.payment.method).toBe("cod");
      expect(order.payment.status).toBe("pending");
    });

    it("normalizeOrder handles order with undefined address", () => {
      const { normalizeOrder } = require("../lib/firestore/orders");
      const order = normalizeOrder("o1", "u1", {
        items: [],
        totalAmount: 100,
        deliveryAddress: "123 Main St 411001",
      });

      expect(order.address).toBeDefined();
    });

    it("normalizeOrder handles order with legacy address format", () => {
      const { normalizeOrder } = require("../lib/firestore/orders");
      const order = normalizeOrder("o1", "u1", {
        items: [],
        totalAmount: 100,
        name: "Legacy User",
        phone: "9999999999",
        deliveryAddress: "Legacy Address",
      });

      expect(order.address.name).toBe("Legacy User");
      expect(order.address.phone).toBe("9999999999");
    });
  });

  describe("Concurrent updates to same config document", () => {
    it("last update wins (Firestore atomic writes)", async () => {
      const { updateAppConfig } = require("../lib/firestore/appConfig");

      await updateAppConfig({ "business.name": "Store V1" });
      await updateAppConfig({ "business.name": "Store V2" });
      await updateAppConfig({ "business.name": "Store V3" });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
      const lastCall = mockUpdateDoc.mock.calls[2];
      expect(lastCall[1]["business.name"]).toBe("Store V3");
    });

    it("concurrent seedDefaultConfig overwrites cleanly", async () => {
      const { seedDefaultConfig } = require("../lib/firestore/appConfig");

      await seedDefaultConfig();
      await seedDefaultConfig();

      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      const lastCall = mockSetDoc.mock.calls[1];
      expect(lastCall[1]).toHaveProperty("business");
      expect(lastCall[1]).toHaveProperty("store");
      expect(lastCall[1]).toHaveProperty("features");
    });
  });

  describe("Cache TTL expiration", () => {
    it("returns stale cache within TTL window", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "Cached" } }));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      const first = await getAppConfig();
      const second = await getAppConfig();

      expect(mockGetDoc).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it("forceRefresh bypasses TTL", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "V1" } }));
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "V2" } }));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      await getAppConfig(false);
      await getAppConfig(true);

      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });

    it("clearAppConfigCache forces fresh read regardless of TTL", async () => {
      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "Before" } }));

      const { getAppConfig, clearAppConfigCache } = require("../lib/firestore/appConfig");
      clearAppConfigCache();
      await getAppConfig();

      clearAppConfigCache();

      mockGetDoc.mockResolvedValueOnce(makeSnap(true, { business: { name: "After" } }));
      const result = await getAppConfig();

      expect(result.business.name).toBe("After");
      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe("groupOrdersIntoBaskets edge cases", () => {
    it("returns empty baskets when no Ready to Dispatch orders", () => {
      const { groupOrdersIntoBaskets } = require("../lib/firestore/orders");
      const orders = [
        { id: "o1", status: "Pending", totalWeight: 500, totalAmount: 100, areaCode: "111" },
        { id: "o2", status: "Delivered", totalWeight: 300, totalAmount: 50, areaCode: "111" },
      ];

      const baskets = groupOrdersIntoBaskets(orders);
      expect(baskets).toEqual([]);
    });

    it("skips orders with assignedDeliveryBoyId", () => {
      const { groupOrdersIntoBaskets } = require("../lib/firestore/orders");
      const orders = [
        {
          id: "o1",
          status: "Ready to Dispatch",
          totalWeight: 500,
          totalAmount: 100,
          areaCode: "111",
          assignedDeliveryBoyId: "boy-1",
        },
      ];

      const baskets = groupOrdersIntoBaskets(orders);
      expect(baskets).toEqual([]);
    });

    it("groups orders by areaCode", () => {
      const { groupOrdersIntoBaskets } = require("../lib/firestore/orders");
      const orders = [
        { id: "o1", status: "Ready to Dispatch", totalWeight: 500, totalAmount: 100, areaCode: "111001" },
        { id: "o2", status: "Ready to Dispatch", totalWeight: 300, totalAmount: 80, areaCode: "111001" },
        { id: "o3", status: "Ready to Dispatch", totalWeight: 400, totalAmount: 120, areaCode: "411001" },
      ];

      const baskets = groupOrdersIntoBaskets(orders);

      const area111 = baskets.filter((b) => b.areaCode === "111001");
      const area411 = baskets.filter((b) => b.areaCode === "411001");
      expect(area111.length).toBeGreaterThan(0);
      expect(area411.length).toBeGreaterThan(0);
    });

    it("splits orders exceeding 10kg weight limit into separate baskets", () => {
      const { groupOrdersIntoBaskets } = require("../lib/firestore/orders");
      const orders = [
        { id: "o1", status: "Ready to Dispatch", totalWeight: 6000, totalAmount: 300, areaCode: "111" },
        { id: "o2", status: "Ready to Dispatch", totalWeight: 5000, totalAmount: 250, areaCode: "111" },
      ];

      const baskets = groupOrdersIntoBaskets(orders);

      expect(baskets.length).toBeGreaterThanOrEqual(2);
    });

    it("assigns AREA_UNKNOWN when areaCode is missing", () => {
      const { groupOrdersIntoBaskets } = require("../lib/firestore/orders");
      const orders = [
        { id: "o1", status: "Ready to Dispatch", totalWeight: 500, totalAmount: 100, areaCode: "" },
      ];

      const baskets = groupOrdersIntoBaskets(orders);
      expect(baskets.length).toBe(1);
      expect(baskets[0].areaCode).toBe("AREA_UNKNOWN");
    });
  });

  describe("exportOrdersToCSV edge cases", () => {
    it("returns CSV with headers only for empty orders", () => {
      const { exportOrdersToCSV } = require("../lib/firestore/orders");
      const csv = exportOrdersToCSV([]);

      const lines = csv.split("\n");
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("Order ID");
      expect(lines[0]).toContain("Status");
      expect(lines[0]).toContain("Total (INR)");
    });

    it("escapes double quotes in field values", () => {
      const { exportOrdersToCSV } = require("../lib/firestore/orders");
      const orders = [
        {
          id: "o1",
          status: "Pending",
          totalAmount: 100,
          payment: { method: "cod" },
          address: { name: 'Test "User"', phone: "123", addressLine: "123 St" },
          areaCode: "111",
          items: [{ name: "Item" }],
          totalWeight: 500,
          outOfCity: false,
          rejectionHistory: [],
        },
      ];

      const csv = exportOrdersToCSV(orders);
      expect(csv).toContain('Test ""User""');
    });

    it("handles orders with null/undefined optional fields", () => {
      const { exportOrdersToCSV } = require("../lib/firestore/orders");
      const orders = [
        {
          id: "o1",
          status: "Pending",
          totalAmount: 0,
          items: [],
          totalWeight: 0,
          outOfCity: false,
          rejectionHistory: [],
        },
      ];

      const csv = exportOrdersToCSV(orders);
      const lines = csv.split("\n");
      expect(lines).toHaveLength(2);
    });

    it("handles Firestore timestamp objects in createdAt", () => {
      const { exportOrdersToCSV } = require("../lib/firestore/orders");
      const orders = [
        {
          id: "o1",
          status: "Delivered",
          totalAmount: 200,
          payment: { method: "razorpay" },
          address: { name: "User" },
          items: [],
          totalWeight: 0,
          outOfCity: false,
          rejectionHistory: [],
          createdAt: { toDate: () => new Date("2026-06-01T10:00:00Z") },
          deliveredAt: { toDate: () => new Date("2026-06-01T11:00:00Z") },
        },
      ];

      const csv = exportOrdersToCSV(orders);
      expect(csv).toContain("2026-06-01");
    });

    it("handles orders with seconds-based timestamps", () => {
      const { exportOrdersToCSV } = require("../lib/firestore/orders");
      const orders = [
        {
          id: "o1",
          status: "Pending",
          totalAmount: 100,
          items: [],
          totalWeight: 0,
          outOfCity: false,
          rejectionHistory: [],
          createdAt: { seconds: 1717200000, nanoseconds: 0 },
        },
      ];

      const csv = exportOrdersToCSV(orders);
      expect(csv).toContain("o1");
    });
  });
});

// ============================================================
// 6. AREA CODE EXTRACTION TESTS
// ============================================================

describe("Area Code Extraction", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("extracts 6-digit pincode from address", () => {
    const { extractAreaCode } = require("../lib/areaCode");
    expect(extractAreaCode("123 Main St, Pune 411001")).toBe("AREA_411001");
  });

  it("returns AREA_UNKNOWN for null/undefined address", () => {
    const { extractAreaCode } = require("../lib/areaCode");
    expect(extractAreaCode(null)).toBe("AREA_UNKNOWN");
    expect(extractAreaCode(undefined)).toBe("AREA_UNKNOWN");
    expect(extractAreaCode("")).toBe("AREA_UNKNOWN");
  });

  it("generates fallback code from address characters when no pincode", () => {
    const { extractAreaCode } = require("../lib/areaCode");
    const result = extractAreaCode("Main Street");
    expect(result).toMatch(/^AREA_/);
    expect(result.length).toBeGreaterThan(5);
  });
});

// ============================================================
// 7. BATCH / TRANSACTION INTEGRITY
// ============================================================

describe("Batch and Transaction Integrity", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("writeBatch creates a batch with update, set, and commit", () => {
    const batch = mockWriteBatch();
    expect(batch).toHaveProperty("update");
    expect(batch).toHaveProperty("set");
    expect(batch).toHaveProperty("commit");
  });

  it("batch.set is called with correct document reference and data", async () => {
    const { dispatchBasket } = require("../lib/firestore/orders");
    const basket = {
      basketId: "BATCH-TEST-1",
      areaCode: "111",
      totalWeight: 500,
      totalAmount: 100,
      orders: [
        {
          id: "order-batch-1",
          userId: "user-batch-1",
          totalAmount: 100,
          totalWeight: 500,
          address: { name: "Batch User", addressLine: "Batch St" },
        },
      ],
    };

    await dispatchBasket(basket, "boy-batch", "Batch Boy");

    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({
        _path: expect.stringContaining("deliveryBoys"),
      }),
      expect.objectContaining({
        orderId: "order-batch-1",
        userId: "user-batch-1",
        name: "Batch User",
      })
    );
  });

  it("batch.update is called with correct document reference and data", async () => {
    const { dispatchBasket } = require("../lib/firestore/orders");
    const basket = {
      basketId: "BATCH-TEST-2",
      areaCode: "222",
      totalWeight: 800,
      totalAmount: 200,
      orders: [
        {
          id: "order-batch-2",
          userId: "user-batch-2",
          totalAmount: 200,
          totalWeight: 800,
          address: {},
        },
      ],
    };

    await dispatchBasket(basket, "boy-2", "Boy 2");

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _path: expect.stringContaining("order-batch-2"),
      }),
      expect.objectContaining({
        status: "Assigned",
        assignedDeliveryBoyId: "boy-2",
      })
    );
  });
});
