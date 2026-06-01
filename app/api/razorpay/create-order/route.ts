import { NextRequest, NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/firestoreAdmin";

export async function POST(req: NextRequest) {
  try {
    const { amount, receipt } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount. Must be greater than 0." }, { status: 400 });
    }

    const orderId = await createRazorpayOrder(amount, receipt);

    return NextResponse.json({ success: true, orderId, amount, currency: "INR", message: "Order initialized successfully" });
  } catch (error: any) {
    console.error("Razorpay Order Init Error:", error);
    return NextResponse.json({ error: error.message || "Failed to initialize Razorpay order" }, { status: 500 });
  }
}
