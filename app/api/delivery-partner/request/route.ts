import { NextRequest, NextResponse } from "next/server";
import { commit } from "@/lib/firestoreAdmin";
import type { WriteOp } from "@/lib/firestoreAdmin";
import { requestDeliveryPartner } from "@/lib/deliveryPartner";

export async function POST(req: NextRequest) {
  try {
    const { orderId, partner } = await req.json();

    if (!orderId || !partner) {
      return NextResponse.json({ error: "orderId and partner are required parameters." }, { status: 400 });
    }

    const result = await requestDeliveryPartner(orderId, partner);

    const writes: WriteOp[] = [
      { operation: "create", collection: "delivery_partner_logs", data: {
        orderId, partner, status: result.status, trackingId: result.trackingId,
        createdAt: new Date().toISOString(),
      }},
    ];

    await commit(writes);

    return NextResponse.json({
      success: true, trackingId: result.trackingId,
      partner: result.partner, status: result.status,
      message: "Order successfully submitted to third-party partner.",
    });
  } catch (error: any) {
    console.error("Delivery Partner Endpoint Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delegate order to partner" }, { status: 500 });
  }
}
