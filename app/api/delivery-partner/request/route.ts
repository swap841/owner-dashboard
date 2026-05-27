// app/api/delivery-partner/request/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { app } from "@/firebaseConfig";
import { requestDeliveryPartner } from "@/lib/deliveryPartner";

const db = getFirestore(app);

export async function POST(req: NextRequest) {
  try {
    const { orderId, partner } = await req.json();

    if (!orderId || !partner) {
      return NextResponse.json(
        { error: "orderId and partner are required parameters." },
        { status: 400 }
      );
    }

    // 1. Dispatch request simulation
    const result = await requestDeliveryPartner(orderId, partner);

    // 2. Create firestore delivery partner log
    const logRef = await addDoc(collection(db, "delivery_partner_logs"), {
      orderId,
      partner,
      status: result.status, // "requested"
      trackingId: result.trackingId,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      logId: logRef.id,
      trackingId: result.trackingId,
      partner: result.partner,
      status: result.status,
      message: "Order successfully submitted to third-party partner.",
    });
  } catch (error: any) {
    console.error("Delivery Partner Endpoint Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delegate order to partner" },
      { status: 500 }
    );
  }
}
