"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Send, ArrowLeft, Phone, Video, Info, 
    MoreVertical, Smile, Paperclip, Mic,
    CheckCheck, Headphones, ShieldCheck, ExternalLink
} from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { useAuth } from '@/hooks/useAuth';

import styles from './Chat.module.css';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

export default function FriendChatPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const friendId = params.id as string;
    
    const [friend, setFriend] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { friends, sendMessage } = useTaskStore();

    // 1. Fetch Friend Info & Messages
    useEffect(() => {
        const foundFriend = friends.find(f => f.id === friendId);
        if (foundFriend) setFriend(foundFriend);
        else {
            // Fallback: Fetch from DB if not in store
            supabase.from('profiles').select('*').eq('id', friendId).single().then(({ data }) => setFriend(data));
        }

        // Initial Message Load
        fetchMessages();

        // 2. Real-time Subscription for this specific chat
        const channel = supabase
            .channel(`chat_${user?.id}_${friendId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `or(and(sender_id.eq.${user?.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user?.id}))`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [friendId, user?.id, friends]);

    const fetchMessages = async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
        
        if (data) setMessages(data);
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || !user?.id) return;

        const content = inputValue.trim();
        setInputValue('');
        await sendMessage(friendId, content);
    };

    const handleBack = () => router.push('/friends');

    if (!friend) return <div className={styles.loading}>Connecting securely...</div>;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button onClick={handleBack} className={styles.backBtn}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className={styles.userInfo}>
                        <div className={styles.avatarWrapper}>
                            <img src={friend.avatar_url} alt={friend.username} className={styles.avatar} />
                            <div className={clsx(styles.onlineStatus, friend.is_online && styles.online)} />
                        </div>
                        <div className={styles.userNameArea}>
                            <h3>{friend.full_name || friend.username}</h3>
                            <span className={clsx(styles.statusText, friend.is_online && styles.onlineText)}>
                                {isTyping ? (
                                    <span className={styles.typingIndicator}>
                                        <span>.</span><span>.</span><span>.</span> typing
                                    </span>
                                ) : (
                                    friend.is_online 
                                        ? (friend.productivity_score > 70 ? '🔥 In Deep Focus' : 'Online') 
                                        : 'Offline'
                                )}
                            </span>
                        </div>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    {friend.is_online ? (
                        <div 
                            className={styles.primaryActionBtn} 
                            style={{ background: 'var(--accent-teal)', color: '#000', cursor: 'default' }}
                        >
                            <ShieldCheck size={18} />
                            <span>Connected</span>
                        </div>
                    ) : (
                        <div 
                            className={styles.primaryActionBtn} 
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        >
                            <ShieldCheck size={18} />
                            <span>Offline</span>
                        </div>
                    )}
                    <div className={styles.actionDivider} />
                    <button className={styles.iconBtn} title="Voice Call"><Phone size={20} /></button>
                    <button className={styles.iconBtn} title="Video Call"><Video size={20} /></button>
                    <button className={styles.iconBtn} title="Info"><Info size={20} /></button>
                </div>
            </header>

            {/* Chat Area */}
            <div className={styles.chatArea} ref={scrollRef}>
                <div className={styles.securityHint}>
                    <ShieldCheck size={14} />
                    Messages are encrypted and synced across your devices.
                </div>
                
                <div className={styles.dateDivider}>Today</div>

                {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.id;
                    let displayContent = msg.content;

                    return (
                        <motion.div 
                            key={msg.id || idx}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className={clsx(styles.messageLine, isMe ? styles.me : styles.them)}
                        >
                            {!isMe && <img src={friend.avatar_url} className={styles.smallAvatar} />}
                            <div className={styles.bubble}>
                                    <p>{msg.content}</p>
                                <div className={styles.msgMeta}>
                                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isMe && <CheckCheck size={14} className={styles.readIcon} />}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Input Footer */}
            <footer className={styles.footer}>
                <div className={styles.inputBar}>
                    <button className={styles.plusBtn}><Paperclip size={20} /></button>
                    <form onSubmit={handleSend} className={styles.form}>
                        <input 
                            type="text" 
                            placeholder={`Message @${friend.username}...`}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button type="button" className={styles.emojiBtn}><Smile size={20} /></button>
                    </form>
                    {inputValue ? (
                        <motion.button 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            onClick={handleSend}
                            className={styles.sendBtn}
                        >
                            <Send size={18} />
                        </motion.button>
                    ) : (
                        <button className={styles.micBtn}><Mic size={20} /></button>
                    )}
                </div>
            </footer>
        </div>
    );
}
