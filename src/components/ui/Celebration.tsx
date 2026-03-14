"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Celebration.module.css';

interface CelebrationProps {
    isVisible: boolean;
    onComplete: () => void;
}

export const Celebration: React.FC<CelebrationProps> = ({ isVisible, onComplete }) => {
    const [particles, setParticles] = useState<any[]>([]);

    useEffect(() => {
        if (isVisible) {
            const newParticles = Array.from({ length: 40 }).map((_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                color: ['#6366f1', '#a855f7', '#10b981', '#f59e0b'][Math.floor(Math.random() * 4)],
                size: Math.random() * 10 + 5,
                rotation: Math.random() * 360,
            }));
            setParticles(newParticles);

            const timer = setTimeout(() => {
                onComplete();
                setParticles([]);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <div className={styles.container}>
                    {particles.map((p) => (
                        <motion.div
                            key={p.id}
                            className={styles.particle}
                            initial={{
                                x: `${p.x}vw`,
                                y: '110vh',
                                rotate: 0,
                                opacity: 1
                            }}
                            animate={{
                                y: '-20vh',
                                rotate: p.rotation + 720,
                                opacity: 0
                            }}
                            transition={{
                                duration: 1.5 + Math.random(),
                                ease: "easeOut"
                            }}
                            style={{
                                backgroundColor: p.color,
                                width: p.size,
                                height: p.size,
                            }}
                        />
                    ))}
                    <motion.div
                        className={styles.message}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                    >
                        MISSION SUCCESS
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
