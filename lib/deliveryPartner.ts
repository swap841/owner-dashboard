// lib/deliveryPartner.ts

import { DeliveryPartnerLog } from "../types";

/**
 * Simulates requesting a delivery partner for out-of-city orders.
 * Generates tracking logs and handles dunzo/shiprocket mock requests.
 */
export async function requestDeliveryPartner(
  orderId: string,
  partner: "shiprocket" | "dunzo" | "other"
): Promise<{ success: boolean; trackingId: string; partner: string; status: string }> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Generate a random tracking ID based on the partner
  const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
  let trackingId = "";

  switch (partner) {
    case "shiprocket":
      trackingId = `SR-${randomStr}`;
      break;
    case "dunzo":
      trackingId = `DZ-${randomStr}`;
      break;
    default:
      trackingId = `DP-${randomStr}`;
  }

  // Simulate response
  return {
    success: true,
    trackingId,
    partner,
    status: "requested",
  };
}
