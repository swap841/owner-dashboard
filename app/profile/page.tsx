// app/profile/page.tsx

"use client";

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { app } from '@/firebaseConfig';
import { useRouter } from 'next/navigation';
import { fetchOwnerProfile, updateOwnerDetails, FullOwnerProfile, addOwnerPartner } from '@/src/ownerUtils'; 
import { useAppConfig } from "@/hooks/useAppConfig";

const auth = getAuth(app);

export default function OwnerProfilePage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<FullOwnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const { config: appConfig } = useAppConfig();
    const storeName = appConfig?.storeName || "Owner";
    
    // Form States
    const [newName, setNewName] = useState('');
    const [partnerEmail, setPartnerEmail] = useState('');
    
    const router = useRouter();

    // 1. Fetch user and profile data
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const profileData = await fetchOwnerProfile(user.uid);
                
                if (profileData && profileData.isOwner) {
                    setProfile(profileData);
                    setNewName(profileData.name || user.displayName || '');
                } else {
                    router.push('/');
                }
            } else {
                router.push('/');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);


    // 2. Handle Name Change
    const handleNameUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !newName) return;
        
        try {
            // Update Auth profile display name
            await updateProfile(currentUser, { displayName: newName });
            
            // Update Firestore record
            await updateOwnerDetails(currentUser.uid, { name: newName });
            
            setProfile(prev => prev ? { ...prev, name: newName } : null);
            alert("Owner name updated successfully!");
        } catch (error) {
            console.error("Error updating name:", error);
            alert("Failed to update name.");
        }
    };
    
    // 3. Handle Partner Addition
    const handlePartnerAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addOwnerPartner(partnerEmail); 
            alert(`Partner email ${partnerEmail} added successfully! (Check console for warning)`);
            setPartnerEmail('');
        } catch (error: any) {
            alert(`Error adding partner: ${error.message}`);
        }
    };

    if (loading) {
        return <div className="min-h-screen pt-20 flex justify-center items-center">Loading Owner Profile...</div>;
    }

    if (!profile) {
        return <div className="min-h-screen pt-20 flex justify-center items-center text-red-600">Access Denied or Profile Not Found.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-20">
            <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-2xl">
                <h1 className="text-4xl font-extrabold text-green-700 mb-6 border-b pb-3">
                    👤 {storeName} Management Portal
                </h1>
                
                {/* --- Current Details --- */}
                <div className="mb-8 p-4 bg-green-50 rounded-lg border-l-4 border-green-600">
                    <h2 className="text-xl font-bold text-gray-800 mb-3">Current Details</h2>
                    <p><strong>Primary Email:</strong> {profile.email}</p>
                    <p><strong>Name:</strong> {profile.name || 'N/A'}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* --- Change Name Form --- */}
                    <div className="bg-gray-100 p-6 rounded-lg shadow-md col-span-2 md:col-span-1">
                        <h2 className="text-2xl font-semibold text-green-600 mb-4">Change Name</h2>
                        <form onSubmit={handleNameUpdate} className="space-y-4">
                            <input
                                type="text"
                                placeholder="New Owner Name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg"
                                required
                            />
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                            >
                                Update Name
                            </button>
                        </form>
                    </div>

                    {/* --- Placeholder: Change Phone Number Form (REMOVED) --- */}

                    {/* --- Add New Partner (Co-Owner) --- */}
                    <div className="bg-gray-100 p-6 rounded-lg shadow-md col-span-2 md:col-span-1">
                        <h2 className="text-2xl font-semibold text-red-600 mb-4">Add Partner (New Owner)</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Note: Requires manual authorization in the `OWNER_EMAILS` list or a secure server.
                        </p>
                        <form onSubmit={handlePartnerAdd} className="space-y-4 flex flex-col gap-3">
                            <input
                                type="email"
                                placeholder="Partner's Email Address"
                                value={partnerEmail}
                                onChange={(e) => setPartnerEmail(e.target.value)}
                                className="flex-grow p-3 border border-gray-300 rounded-lg"
                                required
                            />
                            <button
                                type="submit"
                                className="bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition"
                            >
                                Authorize & Add
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}