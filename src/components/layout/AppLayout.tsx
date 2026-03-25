"use client";

import React from 'react';
import { Sidebar } from './Sidebar';
import { CommandPalette } from '../ui/CommandPalette';
import { StudyInviteListener } from '../notifications/StudyInviteListener';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';


import { useTaskStore } from '@/store/useTaskStore';
import styles from './Layout.module.css';

interface AppLayoutProps {
    children: React.ReactNode;
}

import { useAuth } from '@/hooks/useAuth';

import { Menu, Zap } from 'lucide-react';

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    
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

    // Close sidebar on route change
    React.useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);


    if (isAuthRoute) {
        return <>{children}</>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.mobileHeader}>
                <div className={styles.mobileBranding}>
                    <Zap size={20} fill="var(--accent-primary)" />
                    <span>ESSENTIAL</span>
                </div>
                <button 
                    className={styles.menuToggle}
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open Menu"
                >
                    <Menu size={24} />
                </button>
            </header>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <CommandPalette />
            <StudyInviteListener />
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

