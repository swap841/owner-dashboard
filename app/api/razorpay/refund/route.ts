// app/api/razorpay/refund/route.ts

import { NextRequest, NextResponse } from "next/server";
import { razorpay, isRazorpayConfigured } from "../../../../lib/razorpay";
import { getFirestore, doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { app } from "../../../../firebaseConfig";

const db = getFirestore(app);

export async function POST(req: NextRequest) {
  try {
    const { paymentId, amount, reason, orderId, userId, items } = await req.json();

    // 1. Validation
    if (!paymentId || !amount || amount <= 0 || !orderId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters or invalid refund amount." },
        { status: 400 }
      );
    }

    // 2. Authentication Check (Mock/Verify owner claim or authorization token)
    const authHeader = req.headers.get("authorization");
    console.log("[Auth] Verifying owner request auth header:", authHeader ? "Present" : "None");
    
    // In production, you would verify the ID token:
    // const idToken = authHeader.split('Bearer ')[1];
    // const decodedToken = await adminAuth.verifyIdToken(idToken);
    // if (!decodedToken.isOwner) throw new Error("Unauthorized owner email");

    let refundId = `rfnd_mock_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // 3. Razorpay Refund Dispatch
    if (isRazorpayConfigured()) {
      try {
        const refundResponse = await razorpay.payments.refund(paymentId, {
          amount: Math.round(amount * 100), // convert to paise
          notes: {
            reason: reason || "Admin dashboard initiated refund",
            orderId,
            userId,
          },
        });
        refundId = refundResponse.id;
      } catch (rzpErr: any) {
        console.error("Razorpay SDK Refund API Failure:", rzpErr);
        return NextResponse.json(
          { error: rzpErr.description || rzpErr.message || "Razorpay API refund failed." },
          { status: 500 }
        );
      }
    } else {
      console.warn("Razorpay API keys are placeholder. Simulating successful mock refund.");
    }

    // 4. Firestore Reconciliation Logging
    // A. Log in refunds collection
    const refundRef = await addDoc(collection(db, "refunds"), {
      orderId,
      userId,
      items: items || [],
      totalRefundAmount: amount,
      reason: reason || "Customer request",
      status: "Approved", // Approved immediately on successful payment gateway refund
      createdAt: serverTimestamp(),
      razorpayRefundId: refundId,
      processedBy: "Admin Portal",
    });

    // B. Log/Update order paid status
    try {
      const orderRef = doc(db, "users", userId, "orders", orderId);
      await updateDoc(orderRef, {
        isPaid: false, // Mark unpaid or partially paid
        status: "Cancelled", // Set order cancelled upon full refund
      });
    } catch (dbErr) {
      console.error("[Database] Error updating order status:", dbErr);
    }

    return NextResponse.json({
      success: true,
      refundId,
      amount,
      message: "Refund processed and logged successfully",
    });
  } catch (error: any) {
    console.error("Razorpay Refund Endpoint Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process refund" },
      { status: 500 }
    );
  }
}
