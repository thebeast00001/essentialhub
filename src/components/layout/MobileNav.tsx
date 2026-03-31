"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    CheckSquare, 
    Timer, 
    Users, 
    User,
    Plus
} from 'lucide-react';
import { clsx } from 'clsx';
import styles from './MobileNav.module.css';

export const MobileNav = () => {
    const pathname = usePathname();
    
    const navItems = [
        { icon: LayoutDashboard, label: 'Home', href: '/' },
        { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
        { icon: Timer, label: 'Focus', href: '/focus' },
        { icon: Users, label: 'Social', href: '/friends' },
        { icon: User, label: 'Profile', href: '/profile' },
    ];

    return (
        <nav className={styles.mobileNav}>
            <div className={styles.container}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link 
                            key={item.label} 
                            href={item.href}
                            className={clsx(styles.navItem, isActive && styles.active)}
                        >
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={styles.label}>{item.label}</span>
                            {isActive && <div className={styles.indicator} />}
                        </Link>
                    )
                })}
            </div>
        </nav>
    );
};
