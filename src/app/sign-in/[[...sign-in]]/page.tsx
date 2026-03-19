"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { SignIn } from "@clerk/nextjs";
import { DigitalRain } from '@/components/auth/DigitalRain';
import { Zap } from 'lucide-react';
import styles from './SignIn.module.css';

export default function SignInPage() {
    return (
        <div className={styles.page}>
            <DigitalRain />

            <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* ── LEFT PANEL ───────────────────────────────── */}
                <div className={styles.leftPanel}>
                    <div className={styles.leftContent}>
                        <div className={styles.logoArea}>
                            <div className={styles.logoIcon}>
                                <Zap size={24} fill="var(--accent-primary)" />
                            </div>
                            <span className={styles.logoText}>ESSENTIAL</span>
                        </div>

                        <motion.div
                            className={styles.heroText}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3, duration: 0.7 }}
                        >
                            <h1 className={styles.heroTitle}>Welcome<br />Back.</h1>
                            <p className={styles.heroSub}>Your habits are waiting.<br />Resume where you left off.</p>
                        </motion.div>

                        <motion.div
                            className={styles.statsBlock}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                        >
                            {[
                                { value: '10K+', label: 'Active operators' },
                                { value: '94%',  label: 'Completion rate' },
                                { value: '2.4×', label: 'Productivity boost' },
                            ].map((stat) => (
                                <div key={stat.label} className={styles.statItem}>
                                    <span className={styles.statValue}>{stat.value}</span>
                                    <span className={styles.statLabel}>{stat.label}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>

                {/* ── RIGHT PANEL ──────────────────────────────── */}
                <motion.div
                    className={styles.rightPanel}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.7 }}
                >
                    <div className={styles.rightContentWrapper}>
                        <SignIn 
                            appearance={{
                                elements: {
                                    rootBox: {
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                    },
                                    card: {
                                        background: 'transparent',
                                        boxShadow: 'none',
                                        border: 'none',
                                        width: '100%',
                                        padding: '20px 40px', // Added horizontal padding to prevent touching edges
                                    },
                                    header: {
                                        display: 'none', // Hide default Clerk header
                                    },
                                    socialButtonsBlockButton: {
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: '#ffffff',
                                        height: '52px',
                                        borderRadius: '14px',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                            transform: 'translateY(-1px)',
                                        }
                                    },
                                    socialButtonsBlockButtonText: {
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                    },
                                    dividerLine: {
                                        background: 'rgba(255, 255, 255, 0.1)',
                                    },
                                    dividerText: {
                                        color: 'rgba(255, 255, 255, 0.3)',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        fontWeight: '600',
                                        letterSpacing: '0.05em',
                                    },
                                    formField: {
                                        marginBottom: '20px',
                                        width: '100%',
                                    },
                                    formFieldLabel: {
                                        color: 'rgba(255, 255, 255, 0.4)',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.02rem', // Reduced letter spacing for better alignment
                                        marginBottom: '12px',
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'left',
                                    },
                                    formFieldInput: {
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: '#ffffff',
                                        borderRadius: '14px',
                                        padding: '14px 18px',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s ease',
                                        '&:focus': {
                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.05)',
                                        }
                                    },
                                    formFieldInputShowPasswordButton: {
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        '&:hover': {
                                            color: '#ffffff',
                                        }
                                    },
                                    formButtonPrimary: {
                                        background: 'var(--accent-primary, #ffffff)',
                                        color: 'var(--text-on-accent, #000000)',
                                        fontSize: '0.95rem',
                                        fontWeight: '700',
                                        borderRadius: '14px',
                                        padding: '16px',
                                        marginTop: '16px',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        '&:hover': {
                                            background: '#f3f4f6',
                                            transform: 'translateY(-1px)',
                                        },
                                        '&:active': {
                                            transform: 'translateY(0)',
                                        }
                                    },
                                    otpCodeFieldInputs: {
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        marginBottom: '20px',
                                    },
                                    otpCodeFieldInput: {
                                        width: '46px',
                                        height: '52px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        color: '#ffffff',
                                        fontSize: '1.4rem',
                                        fontWeight: '700',
                                        textAlign: 'center',
                                        padding: '0',
                                        '&:focus': {
                                            borderColor: '#ffffff',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.1)',
                                        }
                                    },
                                    formResendCodeLink: {
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '0.85rem',
                                        textDecoration: 'none',
                                        '&:hover': {
                                            textDecoration: 'underline',
                                        }
                                    },
                                    footerActionText: {
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontSize: '0.9rem',
                                    },
                                    footerActionLink: {
                                        color: '#ffffff',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        '&:hover': {
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            textDecoration: 'underline decoration-thickness-2',
                                        }
                                    }
                                },
                            }}
                        />
                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
}
