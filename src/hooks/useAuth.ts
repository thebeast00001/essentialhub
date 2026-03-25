"use client";

import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import { useTaskStore } from '@/store/useTaskStore';
import { useEffect, useState, useRef, useMemo } from 'react';

export const useAuth = () => {
    const { user: clerkUser, isLoaded, isSignedIn } = useUser();
    const { signOut: globalSignOut } = useClerk();
    const { setUserId, syncProfile } = useTaskStore();
    
    // We maintain a local "user" state for stability during transitions
    const [user, setUser] = useState<any>(null);
    const lastProcessedUserId = useRef<string | null>(null);

    // Derived user object for immediate consistency with Clerk
    const normalizedUser = useMemo(() => {
        if (!clerkUser) return null;
        
        const username = clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'operator';
        
        return {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            user_metadata: {
                full_name: clerkUser.fullName || username || 'Zenith Agent',
                username: username,
                avatar_url: clerkUser.imageUrl
            },
            created_at: clerkUser.createdAt
        };
    }, [clerkUser]);

    useEffect(() => {
        if (!isLoaded) return;

        if (isSignedIn && clerkUser) {
            // Only run initialization if the user ID has actually changed
            if (lastProcessedUserId.current !== clerkUser.id) {
                const initialize = async () => {
                    const currentNormalized = {
                        id: clerkUser.id,
                        email: clerkUser.primaryEmailAddress?.emailAddress,
                        user_metadata: {
                            full_name: clerkUser.fullName || clerkUser.username || 'Zenith Agent',
                            username: clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'operator',
                            avatar_url: clerkUser.imageUrl
                        }
                    };

                    // 1. Update the stores immediately
                    setUserId(clerkUser.id);
                    setUser(currentNormalized);
                    lastProcessedUserId.current = clerkUser.id;

                    // 2. Handle missing usernames (Reddit-style auto-assign)
                    if (!clerkUser.username) {
                        try {
                            const { generateRandomUsername } = await import('@/utils/usernameGenerator');
                            const newUsername = generateRandomUsername();
                            await clerkUser.update({ username: newUsername });
                            // This might trigger a clerkUser change and re-run this effect
                        } catch (err) {
                            console.error("Failed to auto-assign username:", err);
                        }
                    }

                    // 3. Sync to Database
                    const profileUpdate = {
                        email: currentNormalized.email || '',
                        username: currentNormalized.user_metadata.username,
                        full_name: currentNormalized.user_metadata.full_name,
                        avatar_url: currentNormalized.user_metadata.avatar_url
                    };
                    await syncProfile(profileUpdate);
                };
                
                initialize();
            }
        } else if (isLoaded && !isSignedIn) {
            // Only clear if we were previously signed in
            if (lastProcessedUserId.current !== null) {
                setUser(null);
                setUserId('');
                lastProcessedUserId.current = null;
            }
        }
    }, [clerkUser, isLoaded, isSignedIn, setUserId, syncProfile]);

    // Presence Heartbeat
    useEffect(() => {
        if (!isSignedIn || !clerkUser) return;

        const heartbeat = setInterval(() => {
            useTaskStore.getState().updatePresence();
        }, 60000);

        return () => clearInterval(heartbeat);
    }, [clerkUser?.id, isSignedIn]);

    const signOut = async () => {
        // Clear local state first for instant feedback
        setUser(null);
        setUserId('');
        lastProcessedUserId.current = null;
        
        await globalSignOut();
        // Use router instead of href for smoother SPA transition if possible, 
        // but Clerk signOut often works better with full reload
        window.location.href = "/sign-in";
    };

    return { 
        user: normalizedUser || user, 
        loading: !isLoaded, 
        signOut, 
        isAuthenticated: isSignedIn 
    };
};


