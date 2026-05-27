import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
const apps = getApps();
let adminApp = apps[0];

if (!adminApp) {
  const serviceAccountKey = process.env.FIREBASE_ADMIN_KEY
    ? JSON.parse(Buffer.from(process.env.FIREBASE_ADMIN_KEY, 'base64').toString('utf-8'))
    : undefined;

  if (serviceAccountKey) {
    adminApp = initializeApp({
      credential: cert(serviceAccountKey),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  }
}

// Allowlist of emails that can be owners
const ALLOWED_OWNER_EMAILS = (process.env.ALLOWED_OWNER_EMAILS || 'youremail@gmail.com')
  .split(',')
  .map(email => email.trim().toLowerCase());

export async function POST(req: NextRequest) {
  try {
    if (!adminApp) {
      return NextResponse.json(
        { success: false, error: 'Admin SDK not configured' },
        { status: 500 }
      );
    }

    const { uid, email } = await req.json();

    if (!uid || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing uid or email' },
        { status: 400 }
      );
    }

    // Verify email is in allowlist
    if (!ALLOWED_OWNER_EMAILS.includes(email.toLowerCase())) {
      console.warn(`Unauthorized owner signup attempt: ${email}`);
      return NextResponse.json(
        { success: false, error: 'You are not authorized to be an owner' },
        { status: 403 }
      );
    }

    // Set custom claims
    const auth = getAuth(adminApp);
    await auth.setCustomUserClaims(uid, {
      role: 'owner',
      email: email,
      claimsSetAt: new Date().toISOString(),
    });

    // Also update Firestore user document
    const db = getFirestore(adminApp);
    await db.collection('users').doc(uid).set(
      {
        role: 'owner',
        email: email,
        claimsSetAt: new Date().toISOString(),
        isOwner: true,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: `Owner claims set for ${email}`,
    });
  } catch (error) {
    console.error('Error setting owner claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set owner claims' },
      { status: 500 }
    );
  }
}
