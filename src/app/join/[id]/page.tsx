"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { Users, PartyPopper, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser, SignInButton } from '@clerk/nextjs';
import styles from './Join.module.css';

export default function JoinPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const inviterId = params.id as string;
    const [inviter, setInviter] = useState<any>(null);

    useEffect(() => {
        if (inviterId) {
            supabase.from('profiles')
                .select('username, full_name, avatar_url')
                .ilike('username', inviterId)
                .maybeSingle()
                .then(({ data }) => setInviter(data));
        }
    }, [inviterId]);

    // If user is already logged in, redirect to friends to add them
    useEffect(() => {
        if (isLoaded && user && inviter) {
            router.push(`/friends?add=${inviter.username}`);
        }
    }, [isLoaded, user, inviter, router]);

    return (
        <div className={styles.container}>
            <div className={styles.glassCard}>
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={styles.content}
                >
                    <div className={styles.iconCircle}>
                        <PartyPopper size={32} className={styles.popIcon} />
                    </div>
                    
                    <h1 className={clsx("text-gradient", styles.title)}>You're Invited!</h1>
                    
                    {inviter ? (
                        <div className={styles.inviterBox}>
                            <img src={inviter.avatar_url} className={styles.inviterAvatar} />
                            <p><b>@{inviter.username}</b> wants you to join their study circle on <span>ESSENTIAL</span>.</p>
                        </div>
                    ) : (
                        <p className={styles.simpleText}>A friend has invited you to join <span>ESSENTIAL</span> - the ultimate productivity command center.</p>
                    )}

                    <div className={styles.benefits}>
                        <div className={styles.benefit}>
                            <Zap size={18} />
                            <span>Real-time co-working rooms</span>
                        </div>
                        <div className={styles.benefit}>
                            <Users size={18} />
                            <span>Track progress with friends</span>
                        </div>
                        <div className={styles.benefit}>
                            <ShieldCheck size={18} />
                            <span>Unique productivity handles</span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <SignInButton mode="modal">
                            <button className={styles.mainBtn}>
                                Get Started Free <ArrowRight size={18} />
                            </button>
                        </SignInButton>
                        <p className={styles.footerText}>Already have an account? Sign in to accept.</p>
                    </div>
                </motion.div>
            </div>
            
            {/* Background elements */}
            <div className={styles.orb1} />
            <div className={styles.orb2} />
        </div>
    );
}
