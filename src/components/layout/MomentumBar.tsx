"use client";

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import styles from './MomentumBar.module.css';

interface MomentumBarProps {
    tasksCompleted: number;
    habitsCompleted: number;
    focusMinutes: number;
}

export const MomentumBar = ({ tasksCompleted, habitsCompleted, focusMinutes }: MomentumBarProps) => {
    // Velocity calculation: 
    // Each task = 1 unit
    // Each habit = 1 unit
    // Every 30 mins focus = 1 unit
    // Daily target = 10 units
    
    const velocity = useMemo(() => {
        const units = tasksCompleted + habitsCompleted + (focusMinutes / 30);
        return Math.min(100, (units / 10) * 100);
    }, [tasksCompleted, habitsCompleted, focusMinutes]);

    const isHighMomentum = velocity >= 80;

    return (
        <div className={styles.momentumContainer}>
            <div className={styles.meta}>
                <div className={styles.label}>
                    <Zap size={12} className={isHighMomentum ? styles.activeZap : ''} />
                    <span>Momentum</span>
                </div>
                <span className={styles.value}>{Math.round(velocity)}%</span>
            </div>
            
            <div className={styles.barTrack}>
                <motion.div 
                    className={styles.barFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${velocity}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                >
                    <AnimatePresence>
                        {isHighMomentum && (
                            <motion.div 
                                className={styles.glowEffect}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
            
            {isHighMomentum && (
                <motion.span 
                    className={styles.praise}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    Peak Velocity
                </motion.span>
            )}
        </div>
    );
};
