"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Command,
    Plus,
    Timer,
    Calendar,
    Settings,
    X,
    Zap,
    CheckSquare
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './CommandPalette.module.css';
import { clsx } from 'clsx';

export const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();

    const actions = [
        { id: 'new-task', label: 'Create New Task', icon: Plus, shortcut: 'N', action: () => console.log('New Task') },
        { id: 'go-dashboard', label: 'Go to Dashboard', icon: Command, shortcut: 'D', action: () => router.push('/') },
        { id: 'go-tasks', label: 'View All Tasks', icon: CheckSquare, shortcut: 'T', action: () => router.push('/tasks') },
        { id: 'go-focus', label: 'Start Focus Session', icon: Timer, shortcut: 'F', action: () => router.push('/focus') },
        { id: 'go-schedule', label: 'View Schedule', icon: Calendar, shortcut: 'S', action: () => router.push('/schedule') },
        { id: 'go-settings', label: 'System Settings', icon: Settings, shortcut: ',', action: () => router.push('/settings') },
    ];

    const filteredActions = actions.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <motion.div
                className={styles.backdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
            />
            <motion.div
                className={styles.palette}
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
            >
                <div className={styles.searchArea}>
                    <Search size={20} className={styles.searchIcon} />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Type a command or search..."
                        className={styles.input}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                    <div className={styles.meta}>
                        <span className={styles.shortcut}>ESC</span>
                    </div>
                </div>

                <div className={styles.results}>
                    {filteredActions.length > 0 ? (
                        filteredActions.map((action, index) => (
                            <button
                                key={action.id}
                                className={clsx(styles.actionItem, index === selectedIndex && styles.selected)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => {
                                    action.action();
                                    setIsOpen(false);
                                }}
                            >
                                <action.icon size={18} />
                                <span className={styles.label}>{action.label}</span>
                                <div className={styles.actionShortcut}>
                                    <span>⌘</span>
                                    <span>{action.shortcut}</span>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className={styles.noResults}>No commands found for "{query}"</div>
                    )}
                </div>

                <div className={styles.footer}>
                    <div className={styles.footerItem}>
                        <Zap size={14} />
                        <span>Pro Search</span>
                    </div>
                    <div className={styles.footerRight}>
                        <span>Select</span>
                        <span className={styles.miniKey}>↵</span>
                        <span>Navigate</span>
                        <span className={styles.miniKey}>↑↓</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
