"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { 
    Moon, Sun, LogOut, User, 
    Camera, Loader2, Shield, Globe, Palette,
    Edit2, Check, X
} from 'lucide-react';
import styles from './Settings.module.css';
import { clsx } from 'clsx';

type TabType = 'account' | 'appearance' | 'privacy';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { user: authUser, signOut } = useAuth();
    const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
    
    const [activeTab, setActiveTab] = useState<TabType>('account');
    const [mounted, setMounted] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [privacy, setPrivacy] = useState({ publicProfile: false, showStatus: true });

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !clerkUser) return;
        try {
            setIsUploading(true);
            await clerkUser.setProfileImage({ file });
        } catch (error) {
            console.error("Failed to update profile image:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleStartEdit = () => {
        setNewUsername(clerkUser?.username || '');
        setIsEditingUsername(true);
        setUsernameError('');
    };

    const handleSaveUsername = async () => {
        if (!clerkUser || !newUsername || newUsername === clerkUser.username) {
            setIsEditingUsername(false);
            return;
        }

        try {
            setIsUpdatingUsername(true);
            setUsernameError('');
            await clerkUser.update({ username: newUsername });
            setIsEditingUsername(false);
        } catch (error: any) {
            const clerkError = error?.errors?.[0];
            if (clerkError?.code === 'form_identifier_exists' || clerkError?.code === 'username_exists') {
                setUsernameError('Identity already claimed by another operator');
            } else if (clerkError?.code === 'user_reverification_required' || clerkError?.code === 'reverification_required') {
                setUsernameError('Security Protocol: Recent session verification required. Please log out and back in to authorize this identity change.');
            } else if (clerkError?.message) {
                setUsernameError(clerkError.message);
            } else {
                setUsernameError('Protocol error: Username invalid or restricted');
            }
        } finally {
            setIsUpdatingUsername(false);
        }
    };

    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'privacy', label: 'Privacy', icon: Shield },
    ];

    return (
        <motion.div 
            className={styles.dashboardContainer}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            {/* ── TOP HEADER ─────────────────────────────── */}
            <header className={styles.topHeader}>
                <div className={styles.brandArea}>
                    <div className={styles.closeBtn}><Globe size={18} /></div>
                    <h1 className={styles.pageTitle}>Settings</h1>
                </div>
                
                <nav className={styles.pillNav}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={clsx(styles.pillTab, activeTab === tab.id && styles.activePill)}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </header>

            {/* ── MAIN CONTENT GRID ──────────────────────── */}
            <main className={styles.bentoGrid}>
                {/* Profile Card (Large Hero Card) */}
                <section className={clsx(styles.bentoCard, styles.profileCard)}>
                    <div className={styles.profileContent}>
                        <div className={styles.avatarContainer} onClick={handleAvatarClick}>
                            {isUploading ? (
                                <div className={styles.avatarLoader}><Loader2 className="animate-spin" size={24} /></div>
                            ) : (
                                <img 
                                    src={clerkUser?.imageUrl || authUser?.user_metadata?.avatar_url} 
                                    alt="Avatar" 
                                    className={styles.dashboardAvatar} 
                                />
                            )}
                            <div className={styles.cameraOverlay}><Camera size={16} /></div>
                        </div>
                        <div className={styles.profileText}>
                            {!isEditingUsername ? (
                                <div className={styles.usernameRow}>
                                    <h2 className={styles.username}>u/{clerkUser?.username || 'anonymous'}</h2>
                                    <button 
                                        className={styles.editBtn} 
                                        onClick={handleStartEdit}
                                        title="Change Identity"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.editContainer}>
                                    <div className={styles.inputWrapper}>
                                        <span className={styles.prefix}>u/</span>
                                        <input 
                                            type="text" 
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                                            autoFocus
                                            className={styles.usernameInput}
                                            placeholder="new_identity"
                                        />
                                        <div className={styles.editActions}>
                                            <button 
                                                onClick={handleSaveUsername} 
                                                disabled={isUpdatingUsername}
                                                className={styles.saveBtn}
                                            >
                                                {isUpdatingUsername ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                            </button>
                                            <button 
                                                onClick={() => setIsEditingUsername(false)} 
                                                className={styles.cancelBtn}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {usernameError && <p className={styles.errorText}>{usernameError}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className={styles.hidden} 
                        hidden 
                        accept="image/*" 
                        onChange={handleFileChange} 
                    />
                </section>

                {/* Status / Quick Actions */}
                <section className={clsx(styles.bentoCard, styles.statusCard)}>
                    <div className={styles.statGroup}>
                        <span className={styles.statLabel}>Security Status</span>
                        <div className={styles.statValue}>
                            <Shield size={16} className="text-green-500" />
                            <span>Enforced</span>
                        </div>
                    </div>
                    <div className={styles.statGroup}>
                        <span className={styles.statLabel}>Theme Engine</span>
                        <div className={styles.statValue}>
                            <Palette size={16} />
                            <span className="capitalize">{theme}</span>
                        </div>
                    </div>
                </section>

                {/* Dynamic Content Area */}
                <div className={styles.tabContentArea}>
                    <AnimatePresence mode="wait">
                        {activeTab === 'account' && (
                            <motion.div 
                                key="account"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={styles.tabGrid}
                            >
                                <div className={clsx(styles.bentoCard, styles.infoCard)}>
                                    <h3>Email Identifier</h3>
                                    <p className={styles.primaryEmail}>{clerkUser?.primaryEmailAddress?.emailAddress}</p>
                                </div>
                                <div className={clsx(styles.bentoCard, styles.actionCard)}>
                                    <h3>System Session</h3>
                                    <button className={styles.logoutBtn} onClick={() => signOut()}>
                                        <LogOut size={16} /> Terminate
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'appearance' && (
                            <motion.div 
                                key="appearance"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={styles.themeSection}
                            >
                                <div className={clsx(styles.bentoCard, styles.themePicker)}>
                                    <h3>Environment Mapping</h3>
                                    <div className={styles.themeGrid}>
                                        {[
                                            { id: 'dark', label: 'Dark', color: '#000', icon: Moon },
                                            { id: 'light', label: 'Light', color: '#fff', icon: Sun },
                                            { id: 'oceanic', label: 'Oceanic', color: '#0a192f', icon: Globe },
                                        ].map((t) => (
                                            <button 
                                                key={t.id}
                                                className={clsx(styles.themePill, theme === t.id && styles.activeThemePill)}
                                                onClick={() => setTheme(t.id)}
                                            >
                                                <div className={styles.colorDot} style={{ background: t.color }} />
                                                <span>{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'privacy' && (
                            <motion.div 
                                key="privacy"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={styles.privacySection}
                            >
                                <div className={clsx(styles.bentoCard, styles.toggleCard)}>
                                    <div className={styles.toggleRow}>
                                        <div>
                                            <h3>Public Visibility</h3>
                                            <p>Allow profile lookup</p>
                                        </div>
                                        <div 
                                            className={clsx(styles.dashboardToggle, privacy.publicProfile && styles.toggleOn)}
                                            onClick={() => setPrivacy({ ...privacy, publicProfile: !privacy.publicProfile })}
                                        >
                                            <div className={styles.thumb} />
                                        </div>
                                    </div>
                                </div>
                                <div className={clsx(styles.bentoCard, styles.toggleCard)}>
                                    <div className={styles.toggleRow}>
                                        <div>
                                            <h3>Digital Presence</h3>
                                            <p>Show online status</p>
                                        </div>
                                        <div 
                                            className={clsx(styles.dashboardToggle, privacy.showStatus && styles.toggleOn)}
                                            onClick={() => setPrivacy({ ...privacy, showStatus: !privacy.showStatus })}
                                        >
                                            <div className={styles.thumb} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </motion.div>
    );
}

