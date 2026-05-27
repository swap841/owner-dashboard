// /components/OwnerSignup.tsx

"use client";

import React, { useState } from 'react';
import { signUpOwnerWithEmail } from '@/src/ownerUtils'; // Import the utility function

export default function OwnerSignup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('Signing up...');
        try {
            const user = await signUpOwnerWithEmail(email, password);
            if (user) {
                setMessage(`Successfully created and authorized owner: ${user.email}`);
                setEmail('');
                setPassword('');
            }
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
    };

    return (
        <div className="bg-white p-6 rounded shadow max-w-sm mx-auto mt-10">
            <h3 className="text-xl font-bold mb-4 text-red-600">Owner Account Creator (Admin Use Only)</h3>
            <form onSubmit={handleSignup} className="space-y-4">
                <input
                    type="email"
                    placeholder="Authorized Owner Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    type="password"
                    placeholder="Set Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                />
                <button
                    type="submit"
                    className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700"
                >
                    Create New Owner
                </button>
            </form>
            {message && <p className="mt-3 text-sm text-center">{message}</p>}
        </div>
    );
}