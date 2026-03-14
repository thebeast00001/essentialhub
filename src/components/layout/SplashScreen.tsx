'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import styles from './SplashScreen.module.css';

interface SplashScreenProps {
    onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
    const [progress, setProgress] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const duration = 2500; // 2.5 seconds for the loader
        const startTime = Date.now();

        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            
            setProgress(newProgress);

            if (newProgress < 100) {
                requestAnimationFrame(updateProgress);
            } else {
                setTimeout(() => {
                    setIsExiting(true);
                    setTimeout(onComplete, 800); // Wait for exit animation
                }, 400);
            }
        };

        requestAnimationFrame(updateProgress);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div 
                    className={styles.screen}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.45, 0, 0.55, 1] }}
                >
                    <div className={styles.background}>
                        <div className={styles.noise} />
                        <div className={styles.glow} />
                    </div>

                    <div className={styles.content}>
                        <motion.div 
                            className={styles.logoBox}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        >
                            <Sparkles className={styles.star} />
                        </motion.div>

                        <motion.div 
                            className={styles.title}
                            initial={{ opacity: 0, letterSpacing: "1.2em" }}
                            animate={{ opacity: 1, letterSpacing: "0.8em" }}
                            transition={{ duration: 1.5, delay: 0.2 }}
                        >
                            ESSENTIAL
                        </motion.div>

                        <div className={styles.loaderWrapper}>
                            <div className={styles.barTrack}>
                                <motion.div 
                                    className={styles.barFill} 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className={styles.percentage}>
                                {Math.round(progress)}%
                            </div>
                        </div>
                    </div>

                    {/* Elite scan line */}
                    <motion.div 
                        initial={{ top: "-10%" }}
                        animate={{ top: "110%" }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        style={{
                            position: 'absolute',
                            left: 0,
                            width: '100%',
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                            zIndex: 20
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
