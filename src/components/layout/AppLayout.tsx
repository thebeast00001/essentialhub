"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useTaskStore } from '@/store/useTaskStore';
import styles from './Layout.module.css';
import SplashScreen from './SplashScreen';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const pathname = usePathname();
    const { user, isLoaded } = useUser();
    const { setUserId, syncProfile } = useTaskStore();
    const isAuthRoute = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
    
    const [showSplash, setShowSplash] = React.useState(false);

    React.useEffect(() => {
        const hasSeenSplash = sessionStorage.getItem('essential_splash_seen');
        if (!hasSeenSplash && !isAuthRoute) {
            setShowSplash(true);
        }
    }, [isAuthRoute]);

    React.useEffect(() => {
        if (isLoaded && user?.id) {
            setUserId(user.id);
            syncProfile({
                email: user.primaryEmailAddress?.emailAddress || '',
                username: user.username || '',
                full_name: user.fullName || '',
                avatar_url: user.imageUrl || ''
            });

            // Heartbeat: Update presence every 2 minutes
            const interval = setInterval(() => {
                syncProfile({
                    email: user.primaryEmailAddress?.emailAddress || '',
                    username: user.username || '',
                    full_name: user.fullName || '',
                    avatar_url: user.imageUrl || ''
                });
            }, 120000);

            return () => clearInterval(interval);
        }
    }, [isLoaded, user, setUserId, syncProfile]);

    if (showSplash) {
        return <SplashScreen onComplete={() => {
            sessionStorage.setItem('essential_splash_seen', 'true');
            setShowSplash(false);
        }} />;
    }

    if (isAuthRoute) {
        return <>{children}</>;
    }

    return (
        <div className={styles.container}>
            <Sidebar />
            <CommandPalette />
            <main className={styles.main}>
                <div className={styles.content}>
                    {children}
                </div>
            </main>
        </div>
    );
};
