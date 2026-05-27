// /lib/ownerUtils.ts

import { app } from "@/firebaseConfig";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    User,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile
} from "firebase/auth";

const db = getFirestore(app);
const auth = getAuth(app);
const OWNER_COLLECTION = "owners";

// 🔑 Hardcoded Authorized Emails (Replace with your actual owner emails)
const OWNER_EMAILS = [
    "iamswapnilbamane@gmail.com", 
    // Add more authorized emails here
];

// --- Type Definitions ---

export interface OwnerData {
    uid: string;
    email: string;
    name: string | null;
    isOwner: boolean;
    createdAt: Date;
    lastLoginAt?: Date;
}

export interface FullOwnerProfile extends OwnerData {
    extraEmails?: string[];
    partnerEmails?: string[];
    phoneNumber?: string;
    profilePicture?: string;
    updatedAt?: Date;
}

// --- CORE UTILITY FUNCTIONS (Authorization & Firestore Save) ---

/**
 * Checks if a user is an authorized owner based on their email.
 */
export const isAuthorizedOwner = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return OWNER_EMAILS.includes(email.toLowerCase());
};

/**
 * Saves owner details to Firestore and sets the 'isOwner' flag.
 */
export const saveOwnerDetailsToDB = async (user: User) => {
    if (!user.email) return false;

    const ownerRef = doc(db, OWNER_COLLECTION, user.uid);
    const docSnap = await getDoc(ownerRef);

    const authorized = isAuthorizedOwner(user.email);

    if (!docSnap.exists()) {
        const ownerData: FullOwnerProfile = { 
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email?.split('@')[0] || 'Owner',
            isOwner: authorized,
            createdAt: new Date(),
            lastLoginAt: new Date(),
            extraEmails: [],
            partnerEmails: [],
            profilePicture: user.photoURL || undefined,
        };
        await setDoc(ownerRef, ownerData);
    } else {
        // Update existing document
        const updates: any = {
            lastLoginAt: new Date(),
            isOwner: authorized,
            email: user.email, // Update email in case it changed
        };
        
        // Only update name if user has a displayName and it's different
        if (user.displayName && docSnap.data().name !== user.displayName) {
            updates.name = user.displayName;
        }
        
        // Only update profile picture if user has one
        if (user.photoURL) {
            updates.profilePicture = user.photoURL;
        }
        
        await setDoc(ownerRef, updates, { merge: true });
    }

    return authorized;
};

// --- PROFILE MANAGEMENT UTILITY FUNCTIONS ---

/**
 * Fetches the full owner profile data from Firestore.
 */
export const fetchOwnerProfile = async (uid: string): Promise<FullOwnerProfile | null> => {
    try {
        const ownerRef = doc(db, OWNER_COLLECTION, uid);
        const docSnap = await getDoc(ownerRef);

        if (docSnap.exists()) {
            return docSnap.data() as FullOwnerProfile;
        }
        return null;
    } catch (error) {
        console.error("Error fetching owner profile:", error);
        throw error;
    }
};

/**
 * Updates the owner's profile details in Firestore.
 */
export const updateOwnerDetails = async (uid: string, updates: Partial<FullOwnerProfile>) => {
    try {
        const ownerRef = doc(db, OWNER_COLLECTION, uid);
        await setDoc(ownerRef, {
            ...updates,
            updatedAt: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("Error updating owner details:", error);
        throw error;
    }
};

/**
 * Updates the owner's display name in both Firebase Auth and Firestore
 */
export const updateOwnerName = async (uid: string, newName: string): Promise<void> => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No user logged in");
        
        // Update in Firebase Auth
        await updateProfile(user, { displayName: newName });
        
        // Update in Firestore
        await updateOwnerDetails(uid, { name: newName });
    } catch (error) {
        console.error("Error updating owner name:", error);
        throw error;
    }
};

/**
 * Attempts to add a new owner partner's email. (Client-side Placeholder)
 */
export const addOwnerPartner = async (newPartnerEmail: string): Promise<void> => {
    if (!newPartnerEmail || !newPartnerEmail.includes('@')) {
        throw new Error("Invalid email format.");
    }
    
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    
    const ownerRef = doc(db, OWNER_COLLECTION, user.uid);
    const docSnap = await getDoc(ownerRef);
    
    if (docSnap.exists()) {
        const currentPartners = docSnap.data().partnerEmails || [];
        if (!currentPartners.includes(newPartnerEmail)) {
            await updateDoc(ownerRef, {
                partnerEmails: [...currentPartners, newPartnerEmail],
                updatedAt: new Date()
            });
        } else {
            throw new Error("Partner email already exists");
        }
    } else {
        throw new Error("Owner profile not found");
    }
};

/**
 * Removes a partner email from the owner's list
 */
export const removeOwnerPartner = async (partnerEmailToRemove: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    
    const ownerRef = doc(db, OWNER_COLLECTION, user.uid);
    const docSnap = await getDoc(ownerRef);
    
    if (docSnap.exists()) {
        const currentPartners = docSnap.data().partnerEmails || [];
        const updatedPartners = currentPartners.filter((email: string) => email !== partnerEmailToRemove);
        
        await updateDoc(ownerRef, {
            partnerEmails: updatedPartners,
            updatedAt: new Date()
        });
    }
};

// --- AUTHENTICATION HANDLERS ---

/**
 * Signs in using Google.
 */
export const signInWithGoogleOwner = async (): Promise<User | null> => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        const authorized = await saveOwnerDetailsToDB(user);

        if (authorized) {
            return user;
        } else {
            await signOut(auth);
            throw new Error("Unauthorized owner email. Please use an authorized email address.");
        }
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
    }
};

/**
 * Signs up a new owner account using email/password.
 */
export const signUpOwnerWithEmail = async (email: string, password: string): Promise<User | null> => {
    try {
        // First check if email is authorized
        if (!isAuthorizedOwner(email)) {
            throw new Error("The provided email is not authorized for owner sign-up.");
        }

        // Password strength validation
        if (password.length < 6) {
            throw new Error("Password must be at least 6 characters long.");
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Set display name as email username
        const displayName = email.split('@')[0];
        await updateProfile(user, { displayName });
        
        await saveOwnerDetailsToDB(user);
        
        return user;
    } catch (error: any) {
        console.error("Owner Sign-Up Error:", error);
        
        // Handle specific Firebase errors
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("This email is already registered. Please sign in instead.");
        } else if (error.code === 'auth/weak-password') {
            throw new Error("Password is too weak. Please use a stronger password.");
        } else if (error.code === 'auth/invalid-email') {
            throw new Error("Invalid email address format.");
        }
        
        throw error;
    }
};

/**
 * Signs in using email/password (with auto-account creation for authorized emails).
 */
export const signInOwnerWithEmail = async (email: string, password: string): Promise<User | null> => {
    try {
        // First, check if the email is authorized
        if (!isAuthorizedOwner(email)) {
            throw new Error("Unauthorized access. This email is not a registered owner.");
        }

        let user: User;
        
        try {
            // Try to sign in first
            const result = await signInWithEmailAndPassword(auth, email, password);
            user = result.user;
        } catch (signInError: any) {
            // If user doesn't exist, create the account
            if (signInError.code === 'auth/user-not-found') {
                try {
                    // Auto-create account for authorized email
                    const result = await createUserWithEmailAndPassword(auth, email, password);
                    user = result.user;
                    
                    // Set display name
                    const displayName = email.split('@')[0];
                    await updateProfile(user, { displayName });
                    
                } catch (signUpError: any) {
                    console.error("Error creating account:", signUpError);
                    
                    if (signUpError.code === 'auth/weak-password') {
                        throw new Error("Password is too weak. Please use a stronger password.");
                    } else {
                        throw new Error("Failed to create account. Please try again.");
                    }
                }
            } else if (signInError.code === 'auth/wrong-password') {
                throw new Error("Incorrect password. Please try again.");
            } else if (signInError.code === 'auth/too-many-requests') {
                throw new Error("Too many failed login attempts. Please try again later.");
            } else if (signInError.code === 'auth/invalid-credential') {
                throw new Error("Invalid credentials. Please check your email and password.");
            } else {
                throw signInError;
            }
        }

        // Save user details to Firestore and verify authorization
        const authorized = await saveOwnerDetailsToDB(user);
        
        if (authorized) {
            return user;
        } else {
            await signOut(auth);
            throw new Error("Authorization failed. Please contact support.");
        }
    } catch (error) {
        console.error("Email Sign-In Error:", error);
        throw error;
    }
};

/**
 * Signs out the current user
 */
export const signOutOwner = async (): Promise<void> => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign out error:", error);
        throw error;
    }
};

/**
 * Sends password reset email
 */
export const resetOwnerPassword = async (email: string): Promise<void> => {
    try {
        // Check if email is authorized before sending reset
        if (!isAuthorizedOwner(email)) {
            throw new Error("This email is not registered as an owner.");
        }
        
        await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
        console.error("Password reset error:", error);
        
        if (error.code === 'auth/user-not-found') {
            throw new Error("No account found with this email address.");
        } else if (error.code === 'auth/invalid-email') {
            throw new Error("Invalid email address format.");
        } else {
            throw new Error("Failed to send password reset email. Please try again.");
        }
    }
};

/**
 * Gets the current authenticated user
 */
export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};

/**
 * Checks if current user is authenticated and is an owner
 */
export const isCurrentUserOwner = async (): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user || !user.email) return false;
    
    if (!isAuthorizedOwner(user.email)) return false;
    
    try {
        const profile = await fetchOwnerProfile(user.uid);
        return profile?.isOwner || false;
    } catch (error) {
        console.error("Error checking owner status:", error);
        return false;
    }
};

// --- AUTH STATE OBSERVER ---

/**
 * Sets up an observer for auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
    return auth.onAuthStateChanged(callback);
};