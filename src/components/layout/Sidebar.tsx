"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';

import {
    LayoutDashboard,

    CheckSquare,
    Calendar,
    Flame,
    BarChart3,
    Timer,
    Headphones,
    Users,
    Settings,
    LogOut,
    LogIn,
    Zap,
    MoreHorizontal,
    UserPlus,
    Palette,
    BookOpen
} from 'lucide-react';
import { useTaskStore, getLocalDateStr } from '@/store/useTaskStore';
import { MomentumBar } from './MomentumBar';

import styles from './Sidebar.module.css';
import { clsx } from 'clsx';
import { AICommandCenter } from '@/components/dashboard/AICommandCenter';


const generalItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
    { icon: Calendar, label: 'Schedule', href: '/schedule' },
    { icon: Users, label: 'Social Circle', href: '/friends' },
];

const toolItems = [
    { icon: Flame, label: 'Habits', href: '/habits' },
    { icon: BarChart3, label: 'Analytics', href: '/insights' },
    { icon: Timer, label: 'Timer', href: '/focus' },
];



interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();

    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const { tasks, habits, focusTimeToday } = useTaskStore();

    const stats = React.useMemo(() => {
        const today = getLocalDateStr();
        const doneTasks = tasks.filter(t => t.completed && t.completedAt && getLocalDateStr(t.completedAt) === today).length;
        const doneHabits = habits.filter(h => h.completedToday).length;
        return { doneTasks, doneHabits };
    }, [tasks, habits]);

    return (
        <>
            <div 
                className={clsx(styles.overlay, isOpen && styles.overlayVisible)} 
                onClick={onClose}
            />
            <aside className={clsx(styles.sidebar, isOpen && styles.sidebarMobileOpen)}>
                <div className={styles.branding}>
                    <div className={styles.logoArea}>
                        <div className={styles.logoIcon}>
                            <Zap size={20} fill="var(--accent-primary)" />
                        </div>
                        <span className={styles.logoText}>ESSENTIAL</span>
                    </div>
                </div>

                {mounted && (
                    <div className={styles.momentumBar}>
                        <MomentumBar 
                            tasksCompleted={stats.doneTasks}
                            habitsCompleted={stats.doneHabits}
                            focusMinutes={focusTimeToday}
                        />
                    </div>
                )}

                <div className={styles.scrollArea}>
                    <div className={styles.navGroup}>
                        <span className={styles.groupLabel}>General</span>
                        <nav className={styles.nav}>
                            {generalItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={clsx(styles.navItem, pathname === item.href && styles.active)}
                                    onClick={onClose}
                                >
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className={styles.navGroup}>
                        <span className={styles.groupLabel}>Tools</span>
                        <nav className={styles.nav}>
                            {toolItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={clsx(styles.navItem, pathname === item.href && styles.active)}
                                    onClick={onClose}
                                >
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>


                <div className={styles.footer}>
                    <button 
                        onClick={() => {
                            const next = theme === 'dark' ? 'oceanic' : theme === 'oceanic' ? 'light' : 'dark';
                            setTheme(next);
                        }}
                        className={styles.themeToggleBtn}
                        suppressHydrationWarning={true}
                    >

                        <Palette size={18} />
                        <span>Theme: {mounted && theme ? (theme.charAt(0).toUpperCase() + theme.slice(1)) : '...'}</span>
                    </button>


                    <Link href="/settings" className={clsx(styles.navItem, pathname === '/settings' && styles.active)} onClick={onClose}>
                        <Settings size={18} />
                        <span>Settings</span>
                    </Link>

                    {user ? (
                        <div className={styles.bottomProfile}>
                            <Link href={`/profile/${user.id}`} className={styles.profileInfo} style={{ textDecoration: 'none', color: 'inherit' }} onClick={onClose}>
                                <div className={styles.avatarWrapper}>
                                    <img src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email || 'U'}&background=1A1A1A&color=fff`} className={styles.avatarBox} alt="" />
                                    <div className={styles.statusIndicator} />
                                </div>
                                <div className={styles.userMeta}>
                                    <span className={styles.userName}>u/{user.user_metadata?.username || 'agent'}</span>
                                    <span className={styles.userSubtitle}>{user.user_metadata?.full_name}</span>
                                </div>
                            </Link>
                            <button className={styles.logoutMini} onClick={() => signOut()} title="Log Out">
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className={styles.authActions}>
                            <Link href="/sign-in" className={styles.authBtn} onClick={onClose}>
                                <LogIn size={16} />
                                <span>Sign In</span>
                            </Link>
                            <Link href="/sign-up" className={clsx(styles.authBtn, styles.primaryAuth)} onClick={onClose}>
                                <UserPlus size={16} />
                                <span>Sign Up</span>
                            </Link>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

