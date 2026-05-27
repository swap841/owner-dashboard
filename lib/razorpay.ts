// lib/razorpay.ts

import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_xxxx";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "xxxx";

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

/**
 * Helper to check if Razorpay is configured with actual credentials (not defaults).
 */
export function isRazorpayConfigured(): boolean {
  return (
    keyId !== "rzp_test_xxxx" &&
    keySecret !== "xxxx" &&
    keyId.trim() !== "" &&
    keySecret.trim() !== ""
  );
}
