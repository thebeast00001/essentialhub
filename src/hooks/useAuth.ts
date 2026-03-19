"use client";

import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import { useTaskStore } from '@/store/useTaskStore';
import { useEffect, useState } from 'react';

export const useAuth = () => {
    const { user: clerkUser, isLoaded, isSignedIn } = useUser();
    const { signOut: clerkSignOut } = useClerkAuth();
    const { signOut: globalSignOut } = useClerk();
    const { setUserId, syncProfile } = useTaskStore();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const initializeUser = async () => {
            if (isLoaded && isSignedIn && clerkUser) {
                let username = clerkUser.username;
                
                // If no username, generate one automatically (Reddit-style)
                if (!username) {
                    const { generateRandomUsername } = await import('@/utils/usernameGenerator');
                    const newUsername = generateRandomUsername();
                    try {
                        await clerkUser.update({
                            username: newUsername
                        });
                        username = newUsername;
                    } catch (err) {
                        console.error("Failed to auto-assign username:", err);
                        // Fallback to email split if update fails (e.g. usernames not enabled in dashboard)
                        username = clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'operator';
                    }
                }

                // Normalize Clerk user to match the app's expectations
                const normalizedUser = {
                    id: clerkUser.id,
                    email: clerkUser.primaryEmailAddress?.emailAddress,
                    user_metadata: {
                        full_name: clerkUser.fullName || username || 'Zenith Agent',
                        username: username,
                        avatar_url: clerkUser.imageUrl
                    }
                };
                
                setUser(normalizedUser);
                setUserId(clerkUser.id);
                
                // Proactive Profile Synchronization (Future-Proofing for Existing Users)
                // This ensures that as we update the app's metadata requirements, 
                // existing users get their data synced to the latest schema on login.
                const profileUpdate = {
                    email: normalizedUser.email || '',
                    username: normalizedUser.user_metadata.username,
                    full_name: normalizedUser.user_metadata.full_name,
                    avatar_url: normalizedUser.user_metadata.avatar_url
                };

                syncProfile(profileUpdate);
            } else if (isLoaded && !isSignedIn) {
                setUser(null);
                setUserId('');
            }
        };

        initializeUser();

        // Online Presence Heartbeat
        const heartbeat = setInterval(() => {
            if (isLoaded && isSignedIn && clerkUser) {
                useTaskStore.getState().updatePresence();
            }
        }, 60000); // Pulse every 60s

        return () => clearInterval(heartbeat);
    }, [clerkUser, isLoaded, isSignedIn, setUserId, syncProfile]);

    const signOut = async () => {
        await globalSignOut();
        window.location.href = "/sign-in";
    };

    return { 
        user: clerkUser ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            user_metadata: {
                full_name: clerkUser.fullName || clerkUser.username || 'Zenith Agent',
                username: clerkUser.username,
                avatar_url: clerkUser.imageUrl
            }
        } : user, 
        loading: !isLoaded, 
        signOut, 
        isAuthenticated: isSignedIn 
    };
};

