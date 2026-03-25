"use client";

import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import { useTaskStore } from '@/store/useTaskStore';
import { useEffect, useState, useRef } from 'react';

export const useAuth = () => {
    const { user: clerkUser, isLoaded, isSignedIn } = useUser();
    const { signOut: clerkSignOut } = useClerkAuth();
    const { signOut: globalSignOut } = useClerk();
    const { setUserId, syncProfile } = useTaskStore();
    const [user, setUser] = useState<any>(null);
    const lastSyncUserId = useRef<string | null>(null);

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
                        // update() might trigger a reference change for clerkUser, causing effect to re-run
                        username = newUsername;
                    } catch (err) {
                        console.error("Failed to auto-assign username:", err);
                        username = clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'operator';
                    }
                }

                // Normalization
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
                
                // Optimized Profile Synchronization
                // Avoid redundant syncs if the essential data hasn't changed or we just synced this ID
                if (lastSyncUserId.current !== clerkUser.id) {
                    const profileUpdate = {
                        email: normalizedUser.email || '',
                        username: normalizedUser.user_metadata.username,
                        full_name: normalizedUser.user_metadata.full_name,
                        avatar_url: normalizedUser.user_metadata.avatar_url
                    };

                    await syncProfile(profileUpdate);
                    lastSyncUserId.current = clerkUser.id;
                }
            } else if (isLoaded && !isSignedIn) {
                setUser(null);
                setUserId('');
                lastSyncUserId.current = null;
            }
        };

        initializeUser();

        // Online Presence Heartbeat
        const heartbeat = setInterval(() => {
            if (isSignedIn && clerkUser) {
                useTaskStore.getState().updatePresence();
            }
        }, 60000);

        return () => clearInterval(heartbeat);
    }, [clerkUser?.id, isLoaded, isSignedIn, setUserId, syncProfile]);

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

