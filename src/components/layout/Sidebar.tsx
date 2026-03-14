"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { UserButton, useUser, SignInButton } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { dark } from '@clerk/themes';
import {
    LayoutDashboard,
    CheckSquare,
    Calendar,
    Settings,
    BarChart3,
    Timer,
    Flame,
    Search,
    ChevronDown,
    MoreHorizontal,
    Headphones,
    LogIn,
    Users
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { clsx } from 'clsx';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
    { icon: Calendar, label: 'Schedule', href: '/schedule' },
    { icon: Flame, label: 'Habits', href: '/habits' },
    { icon: BarChart3, label: 'Insights', href: '/insights' },
    { icon: Timer, label: 'Timer', href: '/focus' },
    { icon: Headphones, label: 'Study Room', href: '/study' },
];

export const Sidebar = () => {
    const pathname = usePathname();
    const { user, isLoaded, isSignedIn } = useUser();
    const { theme } = useTheme();



    return (
        <aside className={styles.sidebar}>
            <div className={styles.workspaceSelector}>
                <div className={styles.workspaceIcon}>E</div>
                <span className={styles.workspaceName}>ESSENTIAL</span>
                <ChevronDown size={14} className={styles.chevron} />
            </div>

            <div className={styles.searchContainer}>
                <Search size={16} className={styles.searchIcon} />
                <input type="text" placeholder="Search Command Center..." className={styles.searchInput} />
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={clsx(styles.navItem, isActive && styles.active)}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                            {isActive && <div className={styles.activeIndicator} />}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <Link href="/settings" className={styles.navItem}>
                    <Settings size={18} />
                    <span>Settings</span>
                </Link>

                <Link 
                    href="/friends"
                    className={clsx(styles.navItem, pathname === '/friends' && styles.active)}
                >
                    <Users size={18} />
                    <span>Friends</span>
                </Link>

                {isLoaded && isSignedIn && (
                    <div className={styles.userProfile}>
                        <UserButton 
                            appearance={{
                                baseTheme: dark
                            }}
                        />
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>@{user?.username || user?.firstName || 'Anonymous'}</span>
                        </div>
                    </div>
                )}
                
                {isLoaded && !isSignedIn && (
                    <div className={styles.userProfile} style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)' }}>
                        <SignInButton mode="modal">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                                <LogIn size={16} />
                                Sign In / Register
                            </div>
                        </SignInButton>
                    </div>
                )}
            </div>


        </aside>
    );
};
