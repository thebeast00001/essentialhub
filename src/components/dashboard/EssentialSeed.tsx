"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from './EssentialSeed.module.css';
import { Sprout, Sparkles, Leaf, Flower2 } from 'lucide-react';

interface EssentialSeedProps {
    focusMinutes: number;
}

export const EssentialSeed = ({ focusMinutes }: EssentialSeedProps) => {
    // Stage 0: 0-20 min
    // Stage 1: 21-60 min
    // Stage 2: 61-120 min
    // Stage 3: 121-240 min
    // Stage 4: 240+ min
    const stage = useMemo(() => {
        if (focusMinutes <= 20) return 0;
        if (focusMinutes <= 60) return 1;
        if (focusMinutes <= 120) return 2;
        if (focusMinutes <= 240) return 3;
        return 4;
    }, [focusMinutes]);

    const stageLabels = ["Essential Seed", "Sprouting", "Growing", "Flowering", "Radiant Bloom"];
    const stageDescs = [
        "Focus to awaken the life within.",
        "A sign of consistency. Keep going.",
        "Your discipline is taking shape.",
        "Peak productivity achieved.",
        "Your focus is legendary today."
    ];

    return (
        <div className={styles.seedWrapper}>
            <div className={styles.seedContainer}>
                <motion.div 
                    className={styles.seedAura}
                    animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{ 
                        background: stage === 4 ? 'var(--status-success)' : 'var(--accent-primary)',
                        filter: `blur(${15 + stage * 5}px)`
                    }}
                />
                
                <div className={styles.visualArea}>
                    {stage === 0 && (
                        <motion.div 
                            className={styles.seedStage0}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.2 }}
                        >
                            <div className={styles.dot} />
                        </motion.div>
                    )}

                    {stage === 1 && (
                        <motion.div 
                            className={styles.seedStage1}
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                        >
                            <Sprout size={32} className={styles.icon} />
                        </motion.div>
                    )}

                    {stage === 2 && (
                        <motion.div 
                            className={styles.seedStage2}
                            initial={{ scale: 0, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                        >
                            <div className={styles.multiLeaf}>
                                <Leaf size={24} className={styles.leaf1} />
                                <Leaf size={28} className={styles.leaf2} />
                                <Leaf size={24} className={styles.leaf3} />
                            </div>
                        </motion.div>
                    )}

                    {stage === 3 && (
                        <motion.div 
                            className={styles.seedStage3}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                        >
                            <Flower2 size={36} className={styles.icon} />
                            <motion.div 
                                className={styles.sparkleOverlay}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Sparkles size={16} />
                            </motion.div>
                        </motion.div>
                    )}

                    {stage === 4 && (
                        <motion.div 
                            className={styles.seedStage4}
                            initial={{ scale: 0.8 }}
                            animate={{ 
                                scale: [1, 1.05, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 5, repeat: Infinity }}
                        >
                            <div className={styles.bloomWrap}>
                                <Flower2 size={44} className={styles.bloomIcon} />
                                <Sparkles size={24} className={styles.radiantSparkle} />
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            <div className={styles.seedInfo}>
                <span className={styles.stageTitle}>{stageLabels[stage]}</span>
                <span className={styles.stageDesc}>{stageDescs[stage]}</span>
                <div className={styles.progressBar}>
                    <motion.div 
                        className={styles.progressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (focusMinutes / 240) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
