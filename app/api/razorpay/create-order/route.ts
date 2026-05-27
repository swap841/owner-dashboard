// app/api/razorpay/create-order/route.ts

import { NextRequest, NextResponse } from "next/server";
import { razorpay, isRazorpayConfigured } from "../../../../lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const { amount, receipt } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be greater than 0." },
        { status: 400 }
      );
    }

    let orderId = `order_mock_${Math.random().toString(36).substring(2, 9)}`;

    if (isRazorpayConfigured()) {
      // Create actual Razorpay order
      const options = {
        amount: Math.round(amount * 100), // convert to paise
        currency: "INR",
        receipt: receipt || `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      orderId = order.id;
    } else {
      console.warn("Razorpay API keys are placeholders. Returning mock order ID.");
    }

    return NextResponse.json({
      success: true,
      orderId,
      amount,
      currency: "INR",
      message: "Order initialized successfully",
    });
  } catch (error: any) {
    console.error("Razorpay Order Init Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize Razorpay order" },
      { status: 500 }
    );
  }
}
