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
  if (user && pathname === "/dashboard") {
    return (
      <div className="fixed top-4 right-3 z-50">
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
    <nav className="w-full bg-white shadow-md fixed top-0 left-0 z-50">
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
