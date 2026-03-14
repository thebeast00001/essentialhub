"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, X } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import styles from './Focus.module.css';
import { clsx } from 'clsx';

// ─── Formatting Helpers ───────────────────────────────────────────────

function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// ─── Clock Components ──────────────────────────────────────────────────

const HourglassClock = ({ seconds }: { seconds: number }) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    const topRotation = 180 - (m * 6); 
    const bottomRotation = -(s * 6);

    return (
        <div className={styles.clockWrapper}>
            
            {/* Top Dial: Minutes */}
            <motion.div 
                className={clsx(styles.dialContainer, styles.topDial)}
                animate={{ rotate: topRotation }}
                transition={{ type: 'spring', stiffness: 35, damping: 20 }}
            >
                <div className={styles.dialCircle} />
                <div className={styles.dialMarker} />
                
                {Array.from({ length: 60 }).map((_, i) => {
                    return (
                        <div key={'top'+i} className={styles.numberLabel} style={{
                             transform: `rotate(${i * 6}deg) translateY(-155px) rotate(180deg)`
                        }}>
                            {i % 5 === 0 ? (
                                <span>{i}</span>
                            ) : (
                                <div className={styles.dotLabel} />
                            )}
                        </div>
                    );
                })}
            </motion.div>

            {/* Bottom Dial: Seconds */}
            <motion.div 
                className={clsx(styles.dialContainer, styles.bottomDial)}
                animate={{ rotate: bottomRotation }}
                transition={{ type: 'spring', stiffness: 35, damping: 20 }}
            >
                <div className={styles.dialCircle} />
                <div className={styles.dialMarker} />

                {Array.from({ length: 60 }).map((_, i) => {
                    return (
                        <div key={'bot'+i} className={styles.numberLabel} style={{
                             transform: `rotate(${i * 6}deg) translateY(-155px)`
                        }}>
                            {i % 5 === 0 ? (
                                <span>{i}</span>
                            ) : (
                                <div className={styles.dotLabel} />
                            )}
                        </div>
                    );
                })}
            </motion.div>

            {/* Hourglass SVG Overlay */}
            <div className={styles.hourglassOverlay}>
                <svg viewBox="0 0 150 200" fill="none" className={styles.hourglassSvg}>
                    <path 
                        d="M 10 10 L 140 10 L 85 85 L 85 115 L 140 190 L 10 190 L 65 115 L 65 85 Z" 
                        fill="#000" 
                        stroke="#fff" 
                        strokeWidth="8" 
                        strokeLinejoin="miter" 
                    />
                </svg>

                <div className={styles.timerNumber}>{m}</div>
                <div className={styles.timerNumber}>{s.toString().padStart(2, '0')}</div>
            </div>
        </div>
    );
};

// ─── Radio Clock Component ─────────────────────────────────────────────

const RadioClock = ({ seconds, isRunning }: { seconds: number, isRunning: boolean }) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    
    // Each tick is spaced out by the flex gap (24px) + height (1px) = ~25px gap total visual layout
    // We animate the list translating downwards (positive Y) based on passing seconds to simulate rolling
    const offset = s * 25;

    return (
        <div className={styles.radioClockWrapper}>
            <div className={styles.radioInner}>
                
                <div className={styles.radioLeft}>
                    <div className={styles.radioTopText}>
                        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}<br/>
                        <span>ESSENTIAL • ACTIVE</span>
                    </div>
                    
                    <div className={styles.radioMainTime}>
                        <span>{m.toString().padStart(2, '0')}</span>.{s.toString().padStart(2, '0')}
                    </div>
                    
                    <div className={styles.radioSubText}>
                        <div className={styles.recBadge}>
                            <div 
                                className={styles.recDot} 
                                style={{ animationPlayState: isRunning ? 'running' : 'paused' }} 
                            />
                            REC
                        </div>
                        {formatTime(seconds)}
                    </div>
                </div>

                <div className={styles.radioRight}>
                    <div className={styles.redNeedle} />
                    
                    <motion.div 
                        className={styles.ticksList}
                        animate={{ y: offset }}
                        transition={{ type: "spring", stiffness: 45, damping: 15 }}
                    >
                        {Array.from({ length: 90 }).map((_, i) => {
                            // Display from high to low mimicking an analog tuner
                            const val = 60 - i + 15; 
                            const isMajor = val % 5 === 0;
                            return (
                                <div key={i} className={clsx(styles.tick, isMajor && styles.major)}>
                                    {isMajor && val >= 0 && val <= 60 && (
                                        <span className={styles.tickLabel}>{val}</span>
                                    )}
                                </div>
                            )
                        })}
                    </motion.div>
                </div>

            </div>
        </div>
    );
};

// ─── Main Page Component ───────────────────────────────────────────────

export default function FocusPage() {
    const [mounted, setMounted] = useState(false);
    const [clockStyle, setClockStyle] = useState<'hourglass' | 'radio'>('radio');
    const { 
        tasks, timerSeconds, initialTimerSeconds, isTimerRunning,
        startTimer, stopTimer, resetTimer, tickTimer,
        activeTaskId, addFocusTime, focusTimeToday, setTimerDuration
    } = useTaskStore();

    useEffect(() => { setMounted(true); }, []);

    // Timer tick management
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning && timerSeconds > 0) {
            interval = setInterval(() => {
                tickTimer();
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timerSeconds, tickTimer]);

    if (!mounted) return null;

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const mins = parseInt(e.target.value);
        setTimerDuration(mins * 60);
    };

    return (
        <div className={clsx(styles.shell, isTimerRunning && styles.fullscreen)}>
            
            {/* Ambient Background */}
            <div className={styles.ambient}>
                <motion.div 
                    className={styles.blob1} 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.08, 0.12, 0.08],
                        translateX: [0, 50, 0]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div 
                    className={styles.blob2} 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.06, 0.1, 0.06],
                        translateX: [0, -50, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />
                <div className={styles.grid} />
            </div>

            {/* Style Switcher */}
            <AnimatePresence>
                {!isTimerRunning && (
                    <motion.div 
                        className={styles.styleSwitcher}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <button 
                            className={clsx(styles.styleBtn, clockStyle === 'radio' && styles.active)}
                            onClick={() => setClockStyle('radio')}
                        >
                            FM Radio
                        </button>
                        <button 
                            className={clsx(styles.styleBtn, clockStyle === 'hourglass' && styles.active)}
                            onClick={() => setClockStyle('hourglass')}
                        >
                            Hourglass
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Stats & Exit Button */}
            <AnimatePresence>
                {!isTimerRunning ? (
                    <motion.div 
                        className={styles.headerStats}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className={styles.statPill}>
                            <div className={styles.statValue}>{focusTimeToday}</div>
                            <div className={styles.statLabel}>Mins Today</div>
                        </div>
                        <div className={styles.statPill}>
                            <div className={styles.statValue}>{tasks.filter(t => t.completed).length}</div>
                            <div className={styles.statLabel}>Tasks Done</div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.button 
                        className={styles.exitBtn}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => stopTimer()}
                        title="Exit Focus Mode"
                    >
                        <X size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Timer Setup */}
            <AnimatePresence>
                {!isTimerRunning && (
                    <motion.div 
                        className={styles.timerSettings}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <div className={styles.sliderLabel}>SET DURATION: {Math.floor(initialTimerSeconds / 60)} MINS</div>
                        <input 
                            type="range" 
                            min="10" 
                            max="360" 
                            step="5"
                            value={Math.floor(initialTimerSeconds / 60)}
                            onChange={handleDurationChange}
                            className={styles.durationSlider}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={styles.layout}>
                {/* Center Clock */}
                {clockStyle === 'hourglass' ? (
                    <HourglassClock seconds={timerSeconds} />
                ) : (
                    <RadioClock seconds={timerSeconds} isRunning={isTimerRunning} />
                )}
                
                {/* Controls */}
                <AnimatePresence>
                    {!isTimerRunning && (
                        <motion.div 
                            className={styles.controls}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <button 
                                onClick={resetTimer} 
                                className={styles.iconBtn}
                                title="Reset"
                            >
                                <RotateCcw size={32} />
                            </button>
                            
                            <button 
                                onClick={() => startTimer()} 
                                className={styles.playBtn}
                            >
                                <Play fill="currentColor" size={36} style={{ marginLeft: 6 }} />
                            </button>
                            
                            <button 
                                onClick={() => {
                                    const duration = Math.floor((initialTimerSeconds - timerSeconds) / 60);
                                    if (duration > 0) addFocusTime(duration);
                                    resetTimer();
                                }} 
                                className={styles.iconBtn}
                                title="Skip/Complete"
                            >
                                <SkipForward size={32} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
