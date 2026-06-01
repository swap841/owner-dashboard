// app/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    signInOwnerWithEmail, 
    signUpOwnerWithEmail, 
    getCurrentUser, 
    isCurrentUserOwner,
    saveOwnerDetailsToDB,
    onAuthStateChange
} from '@/src/ownerUtils'; 

export default function OwnerLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [checkingAuth, setCheckingAuth] = useState(true);
    const router = useRouter();

    // Check if user is already logged in
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const user = getCurrentUser();
                
                if (user) {
                    // Ensure owners doc exists (for users who signed in before rules fix)
                    await saveOwnerDetailsToDB(user).catch(console.error);
                    
                    // Verify if they are an owner
                    const isOwner = await isCurrentUserOwner();
                    
                    if (isOwner) {
                        // User is authenticated and is an owner, redirect to dashboard
                        router.push('/dashboard');
                    } else {
                        // User is logged in but not an owner
                        console.log("User is not an owner, please sign in with owner account");
                        setErrorMessage("Previous session was not an owner account. Please sign in with owner credentials.");
                    }
                }
            } catch (error) {
                console.error("Error checking auth status:", error);
            } finally {
                setCheckingAuth(false);
            }
        };

        checkAuthStatus();
    }, [router]);

    // Listen to auth state changes
    useEffect(() => {
        // Set up the auth state listener
        const unsubscribe = onAuthStateChange(async (user) => {
            if (user) {
                // Ensure owners doc exists (for users who signed in before rules fix)
                await saveOwnerDetailsToDB(user).catch(console.error);
                const isOwner = await isCurrentUserOwner();
                if (isOwner) {
                    router.push('/dashboard');
                }
            } else {
                // User is signed out, you might want to update UI or clear any user-specific data
                setCheckingAuth(false);
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            if (isSigningUp) {
                // Attempt Sign-Up
                await signUpOwnerWithEmail(email, password);
                // Show success message before redirect
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            } else {
                // Attempt Sign-In
                await signInOwnerWithEmail(email, password);
                // Show success message before redirect
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            }

        } catch (error: any) {
            console.error("Authentication Error:", error);
            
            // Handle specific error messages
            if (error.message.includes("Unauthorized") || error.message.includes("not authorized")) {
                setErrorMessage("Access Denied: Your email is not authorized as an owner.");
            } else if (error.message.includes("Incorrect password")) {
                setErrorMessage("Incorrect password. Please try again.");
            } else if (error.message.includes("user-not-found") || error.message.includes("no user")) {
                setErrorMessage("Account not found. Please sign up first.");
            } else if (error.code === 'auth/weak-password') {
                setErrorMessage("Password should be at least 6 characters.");
            } else if (error.code === 'auth/email-already-in-use') {
                setErrorMessage("Email already in use. Please sign in instead.");
            } else if (error.message.includes("Failed to create account")) {
                setErrorMessage("Failed to create account. Please try again.");
            } else {
                setErrorMessage(error.message || "Authentication failed. Please check your credentials.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Show loading spinner while checking authentication
    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-2xl border border-gray-200">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-green-700">
                        {isSigningUp ? 'Owner Sign Up' : 'Owner Sign In'}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Use your authorized email and password.
                    </p>
                </div>
                
                {/* Error message display */}
                {errorMessage && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                        <p className="text-red-700 text-sm">{errorMessage}</p>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isSigningUp ? "new-password" : "current-password"}
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Sign In')}
                        </button>
                    </div>
                </form>

                <div className="flex justify-center">
                    <button
                        onClick={() => {
                            setIsSigningUp(!isSigningUp);
                            setErrorMessage(''); // Clear error when switching modes
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                        {isSigningUp
                            ? 'Already have an account? Sign In'
                            : "Don't have an account? Sign Up (Requires Authorization)"}
                    </button>
                </div>
            </div>
        </div>
    );
}