"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import styles from './CommandUI.module.css';

interface StatCardProps {
    label: string;
    value: number;
    suffix?: string;
    tendency?: 'up' | 'down';
    trendValue?: string;
    icon: React.ReactNode;
    color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    suffix = '',
    tendency,
    trendValue,
    icon,
    color = 'var(--accent-primary)'
}) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value;
        const duration = 1000;
        const stepTime = Math.abs(Math.floor(duration / end));

        const timer = setInterval(() => {
            start += 1;
            setDisplayValue(start);
            if (start >= end) clearInterval(timer);
        }, stepTime);

        return () => clearInterval(timer);
    }, [value]);

    return (
        <motion.div
            className={clsx('glass-surface', styles.statCard)}
            whileHover={{ y: -4, scale: 1.02 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className={styles.statHeader}>
                <div className={styles.statIcon} style={{ color }}>{icon}</div>
                {tendency && (
                    <div className={clsx(styles.trend, styles[tendency])}>
                        {tendency === 'up' ? '↑' : '↓'} {trendValue}
                    </div>
                )}
            </div>
            <div className={styles.statContent}>
                <div className={styles.statValue}>
                    {displayValue}{suffix}
                </div>
                <div className={styles.statLabel}>{label}</div>
            </div>
        </motion.div>
    );
};

export const Skeleton: React.FC<{ width?: string | number, height?: string | number, className?: string }> = ({
    width = '100%',
    height = '1rem',
    className
}) => (
    <div className={clsx('skeleton', className)} style={{ width, height }} />
);

interface CommandSectionProps {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}

export const CommandSection: React.FC<CommandSectionProps> = ({ title, children, action }) => (
    <section className={styles.section}>
        <header className={styles.sectionHeader}>
            <h2 className="text-gradient">{title}</h2>
            {action}
        </header>
        <div className={styles.sectionBody}>
            {children}
        </div>
    </section>
);
