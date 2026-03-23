"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, X, Shield, ShieldAlert } from 'lucide-react';
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
                        fill="var(--bg-deep)" 
                        stroke="var(--text-primary)" 
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
    
    // Calculate fractional offset for perfect fluid scrolling
    const centerValue = Math.ceil(seconds);
    const fraction = centerValue - seconds; 
    const TICK_HEIGHT = 25; // 24px gap + 1px tick height
    const offset = fraction * TICK_HEIGHT;

    return (
        <div className={styles.radioClockWrapper}>
            <div className={styles.radioInner}>
                
                <div className={styles.radioLeft}>
                    <div className={styles.radioTopText}>
                        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}<br/>
                        <span>ESSENTIAL • ACTIVE</span>
                    </div>
                    
                    <div className={styles.radioMainTime}>
                        <span>{m.toString().padStart(2, '0')}</span>.{Math.floor(s).toString().padStart(2, '0')}
                    </div>
                    
                    <div className={styles.radioSubText}>
                        <div className={styles.recBadge}>
                            <div 
                                className={styles.recDot} 
                                style={{ animationPlayState: isRunning ? 'running' : 'paused' }} 
                            />
                            REC
                        </div>
                        {formatTime(Math.floor(seconds))}
                    </div>
                </div>

                <div className={styles.radioRight}>
                    <div className={styles.redNeedle} />
                    
                    {/* Fixed infinite continuous slider array centered at needle */}
                    <div 
                        className={styles.ticksList}
                        style={{ 
                            top: 'calc(50% - 500px)', 
                            transform: `translateY(-${offset}px)`,
                            transition: 'none' // Controlled strictly by 60fps render loops, zero lag
                        }}
                    >
                        {Array.from({ length: 41 }).map((_, idx) => {
                            const i = idx - 20; // Extent from index -20 to +20 around current frame
                            const val = centerValue - i; // Lower index corresponds to items above needle (higher values)
                            const isMajor = val % 5 === 0;
                            
                            // Don't render negative seconds passing origin
                            if (val < 0) return <div key={idx} className={styles.tick} style={{ opacity: 0 }} />;

                            return (
                                <div key={idx} className={clsx(styles.tick, isMajor && styles.major)}>
                                    {isMajor && val >= 0 && (
                                        <span className={styles.tickLabel}>{val}</span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

// ─── Main Page Component ───────────────────────────────────────────────

export default function FocusPage() {
    const [mounted, setMounted] = useState(false);
    const [clockStyle, setClockStyle] = useState<'hourglass' | 'radio'>('radio');
    const [localGuardianEnabled, setLocalGuardianEnabled] = useState(false);
    
    const { 
        tasks, timerSeconds, initialTimerSeconds, isTimerRunning, timerStartedAt, guardianModeEnabled,
        startTimer, stopTimer, resetTimer, tickTimer,
        activeTaskId, addFocusTime, focusTimeToday, setTimerDuration
    } = useTaskStore();

    // Derived seconds for smooth real-time display
    const [displaySeconds, setDisplaySeconds] = useState(timerSeconds);

    useEffect(() => {
        if (!isTimerRunning || !timerStartedAt) {
            setDisplaySeconds(timerSeconds);
            return;
        }

        let frameId: number;
        const updateDisplay = () => {
            const elapsed = (Date.now() - timerStartedAt) / 1000;
            setDisplaySeconds(Math.max(0, timerSeconds - elapsed));
            frameId = requestAnimationFrame(updateDisplay);
        };

        frameId = requestAnimationFrame(updateDisplay);
        return () => cancelAnimationFrame(frameId);
    }, [isTimerRunning, timerSeconds, timerStartedAt]);

    // Page Visibility API for Guardian Mode
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isTimerRunning && guardianModeEnabled) {
                // User navigated away or minimized the window
                stopTimer(true); // true = broken guardian penalty
                alert("FLOW STATE GUARDIAN TRIGGERED!\n\nYou left the focus screen. Your session was terminated and a severe productivity penalty (-50) was applied.");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isTimerRunning, guardianModeEnabled, stopTimer]);

    useEffect(() => { setMounted(true); }, []);


    if (!mounted) return null;

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const mins = parseInt(e.target.value);
        setTimerDuration(mins * 60);
    };

    return (
        <div className={clsx(styles.shell, isTimerRunning && styles.fullscreen, isTimerRunning && guardianModeEnabled && styles.guardianActive)}>
            
            {/* Ambient Grid */}
            <div className={styles.grid} />

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

                        {/* Guardian Mode Toggle */}
                        <div className={styles.guardianToggleWrapper}>
                            <button 
                                className={clsx(styles.guardianToggleBtn, localGuardianEnabled && styles.guardianToggleActive)}
                                onClick={() => setLocalGuardianEnabled(!localGuardianEnabled)}
                            >
                                {localGuardianEnabled ? <ShieldAlert size={20} /> : <Shield size={20} />}
                                <span>{localGuardianEnabled ? 'GUARDIAN MODE: ON' : 'Enable Guardian Mode'}</span>
                            </button>
                            {localGuardianEnabled && (
                                <span className={styles.guardianWarningText}>Warning: Leaving this screen will cancel the session and apply a -50 penalty.</span>
                            )}
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>

            <div className={styles.layout}>
                {/* Center Clock */}
                {clockStyle === 'hourglass' ? (
                    <HourglassClock seconds={displaySeconds} />
                ) : (
                    <RadioClock seconds={displaySeconds} isRunning={isTimerRunning} />
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
                                onClick={() => startTimer(undefined, localGuardianEnabled)} 
                                className={clsx(styles.playBtn, localGuardianEnabled && styles.playBtnGuardian)}
                            >
                                <Play fill="currentColor" size={36} style={{ marginLeft: 6 }} />
                            </button>
                            
                            <button 
                                onClick={() => {
                                    const actualRem = isTimerRunning && timerStartedAt 
                                        ? timerSeconds - Math.floor((Date.now() - timerStartedAt) / 1000)
                                        : timerSeconds;
                                    const duration = Math.floor((initialTimerSeconds - actualRem) / 60);
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
