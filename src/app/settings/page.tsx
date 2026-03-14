"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { UserProfile, useUser, SignOutButton } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { Settings2, Moon, Sun, Monitor, LogOut, User } from 'lucide-react';
import styles from './Settings.module.css';
import { clsx } from 'clsx';
import { dark } from '@clerk/themes';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { user, isSignedIn } = useUser();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => setMounted(true), []);

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1 className="text-gradient">Settings</h1>
                    <p className={styles.subtitle}>Configure your ESSENTIAL environment.</p>
                </div>
            </header>

            {/* Theme row removed - App is now Dark Mode only */}

            {isSignedIn && (
                <>
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <User size={24} style={{ color: 'var(--accent-primary)' }} />
                            Account Alias
                        </div>
                        <div className={styles.settingRow} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                            <div className={styles.settingInfo}>
                                <h3>Active Alias</h3>
                                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>
                                    @{user?.username || user?.firstName || 'Anonymous'}
                                </p>
                            </div>
                            
                            <SignOutButton signOutOptions={{ sessionId: undefined }}>
                                <button className={styles.logoutBtn}>
                                    <LogOut size={16} /> Disconnect
                                </button>
                            </SignOutButton>
                        </div>
                    </div>

                    <div className={styles.section} style={{ padding: 0, overflow: 'hidden', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                        <div className={styles.sectionTitle} style={{ padding: '0 8px' }}>
                            Account Details
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <UserProfile 
                                routing="hash"
                                appearance={{
                                    baseTheme: dark,
                                    elements: {
                                        card: {
                                            width: '100%',
                                            maxWidth: '100%',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-card)'
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </>
            )}
            
            {!isSignedIn && mounted && (
                <div className={styles.section}>
                    <div className={styles.settingInfo} style={{ textAlign: 'center' }}>
                        <h3>Not Authenticated</h3>
                        <p>Sign in from the sidebar to view your profile settings.</p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
