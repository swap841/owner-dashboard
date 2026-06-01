import { NextRequest, NextResponse } from "next/server";
import { setDocument, setCustomClaims } from "@/lib/firestoreAdmin";

const ALLOWED_OWNER_EMAILS = (process.env.ALLOWED_OWNER_EMAILS || "youremail@gmail.com").split(",").map(e => e.trim().toLowerCase());

export async function POST(req: NextRequest) {
  try {
    const { uid, email } = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ success: false, error: "Missing uid or email" }, { status: 400 });
    }

    if (!ALLOWED_OWNER_EMAILS.includes(email.toLowerCase())) {
      console.warn(`Unauthorized owner signup attempt: ${email}`);
      return NextResponse.json({ success: false, error: "You are not authorized to be an owner" }, { status: 403 });
    }

    await setCustomClaims(uid, { role: "owner", email, claimsSetAt: new Date().toISOString() });

    await setDocument("users", uid, {
      role: "owner", email, claimsSetAt: new Date().toISOString(), isOwner: true,
    });

    return NextResponse.json({ success: true, message: `Owner claims set for ${email}` });
  } catch (error) {
    console.error("Error setting owner claims:", error);
    return NextResponse.json({ success: false, error: "Failed to set owner claims" }, { status: 500 });
  }
}
