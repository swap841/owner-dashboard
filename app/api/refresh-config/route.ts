import { NextRequest, NextResponse } from "next/server";

const ADMIN_KEY = process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get("x-admin-key") || "";
    if (ADMIN_KEY && key !== ADMIN_KEY) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "https://grocery-server-10ct.onrender.com";
    fetch(`${serverUrl}/api/invalidate-cache`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
    }).catch(() => {});

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
