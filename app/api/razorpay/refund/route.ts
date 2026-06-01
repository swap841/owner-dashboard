import { NextRequest, NextResponse } from "next/server";
import { commit, processRazorpayRefund } from "@/lib/firestoreAdmin";
import type { WriteOp } from "@/lib/firestoreAdmin";

export async function POST(req: NextRequest) {
  try {
    const { paymentId, amount, reason, orderId, userId, items } = await req.json();

    if (!paymentId || !amount || amount <= 0 || !orderId || !userId) {
      return NextResponse.json({ error: "Missing required parameters or invalid refund amount." }, { status: 400 });
    }

    const refundId = await processRazorpayRefund(paymentId, amount, reason);

    const writes: WriteOp[] = [
      { operation: "create", collection: "refunds", data: {
        orderId, userId, items: items || [], totalRefundAmount: amount,
        reason: reason || "Customer request", status: "Approved",
        createdAt: new Date().toISOString(), razorpayRefundId: refundId, processedBy: "Admin Portal",
      }},
      { operation: "update", collection: `users/${userId}/orders`, docId: orderId, data: {
        isPaid: false, status: "Cancelled",
      }},
    ];

    await commit(writes);

    return NextResponse.json({ success: true, refundId, amount, message: "Refund processed and logged successfully" });
  } catch (error: any) {
    console.error("Razorpay Refund Endpoint Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process refund" }, { status: 500 });
  }
}
