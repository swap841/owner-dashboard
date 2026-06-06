"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { app } from "@/firebaseConfig";
import { signInWithGoogleOwner } from "@/src/ownerUtils";

const auth = getAuth(app);
const FALLBACK_IMAGE_URL = "/fallback-image.png";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();   // <-- Detect current page

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {});
    }
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const user = await signInWithGoogleOwner();
      if (user) router.push("/dashboard");
    } catch (err: any) {
      if (err.message?.includes("Unauthorized owner email")) {
        alert("Access Denied: Unauthorized Owner");
      } else {
        alert("Sign-in failed");
      }
      router.push("/");
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
    router.push("/");
  };

  // ===========================================
  // 🔥 SHOW ONLY PROFILE IMAGE ON DASHBOARD
  // ===========================================
  const getFcmToken = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notification permission required to get FCM token.");
        return;
      }
      const { getMessaging, getToken } = await import("firebase/messaging");
      const { getFirestore, doc, setDoc } = await import("firebase/firestore");
      const msg = getMessaging(app);
      const token = await getToken(msg, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      const db = getFirestore(app);
      await setDoc(doc(db, "contactInfo", "info"), { ownerFcmToken: token }, { merge: true });
      alert(`FCM Token saved & copied!\n\n${token}`);
    } catch (err: any) {
      alert("Error getting FCM token: " + err.message);
    }
  };

  if (user && pathname === "/dashboard") {
    return (
      <div className="fixed top-4 right-3 z-50 flex items-center gap-2">
        <button
          onClick={getFcmToken}
          title="Get FCM Token"
          className="w-8 h-8 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold transition"
        >
          🔔
        </button>
        <Link href="/profile">
          <Image
            src={user.photoURL || FALLBACK_IMAGE_URL}
            width={50}
            height={50}
            alt="Profile"
            className="rounded-full cursor-pointer border-2 border-green-600 shadow-lg hover:border-green-800 transition duration-200"
          />
        </Link>
      </div>
    );
  }

  // ===========================================
  // 🔥 FULL NAVBAR FOR ALL OTHER PAGES
  // ===========================================
  return (
    <nav className="w-full bg-white dark:bg-zinc-900 shadow-md fixed top-0 left-0 z-50 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 py-0 flex justify-between items-center h-16">
        <Link href="/" className="text-4xl font-bold text-green-600">
          Owner Hub
        </Link>

        <div className="flex items-center gap-4">
          {!user && (
            <button
              onClick={loginWithGoogle}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center space-x-1 hover:bg-green-700 transition duration-150"
            >
              Sign In with Google
            </button>
          )}

          {user && (
            <button
              onClick={logoutUser}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
