"use client";

import { MapPin, Phone, Mail, Clock, Globe } from "lucide-react";
import { useAppConfig } from "@/hooks/useAppConfig";

export default function StorePreview() {
  const { config } = useAppConfig();

  return (
    <div className="bg-white rounded-2xl border p-6 space-y-4">
      <div className="flex items-center gap-3">
        {config.storeLogo ? (
          <img src={config.storeLogo} alt={config.storeName} className="w-12 h-12 rounded-xl object-cover" />
        ) : (
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            {config.storeName.charAt(0)}
          </div>
        )}
        <div>
          <h3 className="font-bold text-lg">{config.storeName}</h3>
          <p className="text-xs text-gray-500">Store Information Preview</p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-600">{config.shopLocation.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-600">{config.contactInfo.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-600">{config.contactInfo.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-600">{config.contactInfo.workingHours.monday_friday}</span>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold text-sm mb-3">Quick Links</h4>
        <div className="flex flex-wrap gap-2">
          {config.contactInfo.socialMedia.instagram && (
            <a href={config.contactInfo.socialMedia.instagram} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg text-xs font-medium hover:bg-pink-100">
              <Globe className="w-3.5 h-3.5" /> Instagram
            </a>
          )}
          {config.contactInfo.socialMedia.facebook && (
            <a href={config.contactInfo.socialMedia.facebook} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100">
              <Globe className="w-3.5 h-3.5" /> Facebook
            </a>
          )}
          <a href={config.shopLocation.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${config.shopLocation.lat},${config.shopLocation.lng}`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100">
            <MapPin className="w-3.5 h-3.5" /> View on Map
          </a>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold text-sm mb-2">Delivery Settings</h4>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-500">Radius</p>
            <p className="font-bold">{config.deliverySettings.radiusKm} km</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-500">Charge</p>
            <p className="font-bold">₹{config.deliverySettings.deliveryCharge}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-500">Free above</p>
            <p className="font-bold">₹{config.deliverySettings.freeDeliveryAbove}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
