"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';


import { useTaskStore } from '@/store/useTaskStore';
import styles from './Layout.module.css';

interface AppLayoutProps {
    children: React.ReactNode;
}

import { useAuth } from '@/hooks/useAuth';

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const router = useRouter();
    const isAuthRoute = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/auth/callback');
    
    React.useEffect(() => {
        if (!loading && !user && !isAuthRoute) {
            router.push('/sign-in');
        }
    }, [user, loading, isAuthRoute, router]);

    const { isTimerRunning, tickTimer } = useTaskStore();
    
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning) {
            interval = setInterval(() => {
                tickTimer();
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, tickTimer]);


    if (isAuthRoute) {
        return <>{children}</>;
    }

    return (
        <div className={styles.container}>
            <Sidebar />
            <CommandPalette />
            <main className={styles.main}>
                <motion.div 
                    className={styles.content}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: loading ? 0 : 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    {children}
                </motion.div>
            </main>
        </div>
    );
};
