import { useQuery } from "@tanstack/react-query";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

export interface AppConfig {
  storeName: string;
  storeLogo: string;
  primaryColor: string;
  accentColor: string;
  darkModeEnabled: boolean;
  shopLocation: {
    address: string;
    lat: number;
    lng: number;
    googleMapsLink: string;
    landmark: string;
    directions: string;
  };
  contactInfo: {
    phone: string;
    phoneSecondary: string;
    email: string;
    emailOrders: string;
    whatsappNumber: string;
    workingHours: {
      monday_friday: string;
      saturday: string;
      sunday: string;
    };
    socialMedia: {
      instagram: string;
      facebook: string;
    };
  };
  aboutUs: {
    story: string;
    mission: string;
    vision: string;
    foundingDate: string;
  };
  deliverySettings: {
    radiusKm: number;
    deliveryCharge: number;
    freeDeliveryAbove: number;
    estimatedTime: string;
    timeSlots: string[];
  };
}

const DEFAULT_CONFIG: AppConfig = {
  storeName: "My Store",
  storeLogo: "",
  primaryColor: "#059669",
  accentColor: "#0d9488",
  darkModeEnabled: false,
  shopLocation: {
    address: "123 Main Street, City",
    lat: 18.5204,
    lng: 73.8567,
    googleMapsLink: "",
    landmark: "",
    directions: "",
  },
  contactInfo: {
    phone: "+91 98765 43210",
    phoneSecondary: "",
    email: "support@mystore.com",
    emailOrders: "orders@mystore.com",
    whatsappNumber: "+91 98765 43210",
    workingHours: {
      monday_friday: "9:00 AM - 9:00 PM",
      saturday: "9:00 AM - 8:00 PM",
      sunday: "10:00 AM - 6:00 PM",
    },
    socialMedia: {
      instagram: "",
      facebook: "",
    },
  },
  aboutUs: {
    story: "",
    mission: "",
    vision: "",
    foundingDate: "",
  },
  deliverySettings: {
    radiusKm: 5,
    deliveryCharge: 40,
    freeDeliveryAbove: 299,
    estimatedTime: "30-45 minutes",
    timeSlots: ["9-11 AM", "11-1 PM", "2-4 PM", "4-6 PM", "6-8 PM"],
  },
};

export function useAppConfig() {
  const { data: config, isLoading, error } = useQuery<AppConfig>({
    queryKey: ["appConfig"],
    queryFn: () => new Promise<AppConfig>((resolve) => {
      const ref = doc(db, "appConfig", "settings");
      const unsubscribe = onSnapshot(ref, (snap) => {
        unsubscribe();
        if (snap.exists()) {
          const raw = snap.data() as any;
          // Map nested config structure to flat AppConfig interface
          const mapped: AppConfig = {
            storeName: raw.business?.name || DEFAULT_CONFIG.storeName,
            storeLogo: raw.business?.logoUrl || DEFAULT_CONFIG.storeLogo,
            primaryColor: raw.business?.primaryColor || DEFAULT_CONFIG.primaryColor,
            accentColor: raw.business?.accentColor || DEFAULT_CONFIG.accentColor,
            darkModeEnabled: raw.features?.darkMode ?? DEFAULT_CONFIG.darkModeEnabled,
            shopLocation: {
              address: raw.store?.location?.address || DEFAULT_CONFIG.shopLocation.address,
              lat: raw.store?.location?.lat || DEFAULT_CONFIG.shopLocation.lat,
              lng: raw.store?.location?.lng || DEFAULT_CONFIG.shopLocation.lng,
              googleMapsLink: raw.store?.location?.googleMapsLink || "",
              landmark: raw.store?.location?.landmark || "",
              directions: raw.store?.location?.directions || "",
            },
            contactInfo: {
              phone: raw.contact?.phone || DEFAULT_CONFIG.contactInfo.phone,
              phoneSecondary: raw.contact?.phoneSecondary || "",
              email: raw.contact?.email || DEFAULT_CONFIG.contactInfo.email,
              emailOrders: raw.contact?.emailOrders || "",
              whatsappNumber: raw.contact?.whatsappNumber || raw.notifications?.whatsAppPhoneNumberId || "",
              workingHours: raw.contact?.workingHours || DEFAULT_CONFIG.contactInfo.workingHours,
              socialMedia: raw.contact?.socialMedia || DEFAULT_CONFIG.contactInfo.socialMedia,
            },
            aboutUs: raw.aboutUs || DEFAULT_CONFIG.aboutUs,
            deliverySettings: {
              radiusKm: raw.deliveryZones?.maxLocalWeightKg || DEFAULT_CONFIG.deliverySettings.radiusKm,
              deliveryCharge: raw.store?.deliveryCharge || DEFAULT_CONFIG.deliverySettings.deliveryCharge,
              freeDeliveryAbove: raw.store?.freeDeliveryAbove || DEFAULT_CONFIG.deliverySettings.freeDeliveryAbove,
              estimatedTime: raw.deliveryZones?.estimatedDeliveryHours || DEFAULT_CONFIG.deliverySettings.estimatedTime,
              timeSlots: raw.deliverySettings?.timeSlots || DEFAULT_CONFIG.deliverySettings.timeSlots,
            },
          };
          resolve(mapped);
        } else {
          resolve(DEFAULT_CONFIG);
        }
      }, () => {
        resolve(DEFAULT_CONFIG);
      });
    }),
    staleTime: 5 * 60 * 1000,
  });

  return { config: config ?? DEFAULT_CONFIG, isLoading, error };
}
