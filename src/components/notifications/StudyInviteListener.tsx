"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, X, ExternalLink, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export const StudyInviteListener = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [activeInvite, setActiveInvite] = useState<{
        senderName: string;
        room: string;
        message: string;
        senderId: string;
    } | null>(null);

    useEffect(() => {
        if (!user?.id) return;

        // Listen for new messages incoming to this user
        const channel = supabase
            .channel(`invites_${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${user.id}`
            }, async (payload) => {
                const content = payload.new.content as string;
                if (content?.startsWith('[STUDY_INVITE]')) {
                    // Extract data: [STUDY_INVITE]room_id|message
                    const raw = content.replace('[STUDY_INVITE]', '');
                    const [room, message] = raw.split('|');
                    
                    // Fetch sender name
                    const { data: sender } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', payload.new.sender_id)
                        .single();

                    setActiveInvite({
                        senderName: sender?.username || 'A friend',
                        room,
                        message,
                        senderId: payload.new.sender_id
                    });

                    // Auto hide after 15 seconds
                    setTimeout(() => setActiveInvite(null), 15000);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const handleJoin = () => {
        if (!activeInvite) return;
        router.push(`/study-room`); // Direct to study-room, optionally with query param
        setActiveInvite(null);
    };

    return (
        <AnimatePresence>
            {activeInvite && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50, x: '-50%' }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, scale: 0.8, y: 20, x: '-50%' }}
                    style={{
                        position: 'fixed',
                        bottom: '40px',
                        left: '50%',
                        zIndex: 9999,
                        width: '380px',
                        background: 'rgba(20, 20, 25, 0.85)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        border: '1px solid rgba(255, 122, 69, 0.3)',
                        borderRadius: '24px',
                        padding: '20px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 122, 69, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ 
                                background: 'rgba(255, 122, 69, 0.15)', 
                                padding: '8px', 
                                borderRadius: '12px',
                                color: '#ff7a45'
                            }}>
                                <Zap size={18} fill="#ff7a45" />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', color: '#ff7a45' }}>
                                STUDY INVITATION
                            </span>
                        </div>
                        <button 
                            onClick={() => setActiveInvite(null)}
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div style={{ marginLeft: '4px' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                            @{activeInvite.senderName} is inviting you
                        </h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                            {activeInvite.message}
                        </p>
                    </div>

                    <button 
                        onClick={handleJoin}
                        style={{
                            marginTop: '4px',
                            background: '#ff7a45',
                            color: '#fff',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '14px',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 8px 16px rgba(255, 122, 69, 0.2)',
                            transition: '0.2s'
                        }}
                    >
                        <ExternalLink size={16} />
                        Join Focus Session
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
