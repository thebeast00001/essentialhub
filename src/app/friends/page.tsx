"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Search, UserPlus, Headphones, 
    TrendingUp, Activity, MessageSquare, 
    Share2, MoreVertical, Star, Bell, Shield, Check, X
} from 'lucide-react';
import styles from './Friends.module.css';
import { clsx } from 'clsx';
import { useTaskStore } from '@/store/useTaskStore';
import { useUser } from '@clerk/nextjs';

export default function FriendsPage() {
    const { user } = useUser();
    const { 
        friends, pendingRequests, fetchFriends, 
        addFriendByUsername, acceptFriendRequest 
    } = useTaskStore();

    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
    const [addUsername, setAddUsername] = useState('');
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchFriends();
        
        // Handle invitation referral
        const params = new URLSearchParams(window.location.search);
        const referral = params.get('add');
        if (referral) {
            setAddUsername(referral);
            // Autofocus add input
            setTimeout(() => document.getElementById('add-friend-input')?.focus(), 500);
        }
    }, [fetchFriends]);

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addUsername.trim()) return;
        
        setIsAdding(true);
        setStatusMsg(null);
        
        const result = await addFriendByUsername(addUsername.trim().replace('@', ''));
        setStatusMsg({ type: result.success ? 'success' : 'error', text: result.message });
        
        if (result.success) {
            setAddUsername('');
            setTimeout(() => setStatusMsg(null), 5000);
        }
        setIsAdding(false);
    };

    const copyInviteLink = () => {
        const link = `${window.location.origin}/join?ref=${user?.username || 'user'}`;
        navigator.clipboard.writeText(link);
        setStatusMsg({ type: 'success', text: 'Invite link copied to clipboard!' });
        setTimeout(() => setStatusMsg(null), 3000);
    };

    if (!mounted) return null;

    const filteredFriends = friends.filter(f => 
        f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={clsx(styles.orb, styles.orb1)} />
            <div className={clsx(styles.orb, styles.orb2)} />
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.pageIcon}>
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-gradient">Social Circle</h1>
                        <p className={styles.subtitle}>Connect and study with real people.</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.addFriendBtn} onClick={() => document.getElementById('add-friend-input')?.focus()}>
                        <UserPlus size={18} />
                        <span>Find Friend</span>
                    </button>
                </div>
            </header>

            <div className={styles.layout}>
                <main className={styles.mainContent}>
                    {/* Add Friend Form */}
                    <div className={styles.addSection}>
                        <form onSubmit={handleAddFriend} className={styles.addForm}>
                            <div className={styles.inputWrapper}>
                                <UserPlus size={18} className={styles.inputIcon} />
                                <input 
                                    id="add-friend-input"
                                    type="text" 
                                    placeholder="Enter unique username (e.g. ansh_123)" 
                                    value={addUsername}
                                    onChange={(e) => setAddUsername(e.target.value)}
                                />
                            </div>
                            <button type="submit" disabled={isAdding || !addUsername} className={styles.submitAdd}>
                                {isAdding ? 'Searching...' : 'Add Friend'}
                            </button>
                        </form>
                        <AnimatePresence>
                            {statusMsg && (
                                <motion.div 
                                    className={clsx(styles.statusBanner, styles[statusMsg.type])}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {statusMsg.type === 'success' ? <Check size={14} /> : <X size={14} />}
                                    {statusMsg.text}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        <button 
                            className={clsx(styles.tab, activeTab === 'all' && styles.activeTab)}
                            onClick={() => setActiveTab('all')}
                        >
                            Following <span>{friends.length}</span>
                        </button>
                        <button 
                            className={clsx(styles.tab, activeTab === 'requests' && styles.activeTab)}
                            onClick={() => setActiveTab('requests')}
                        >
                            Requests <span>{pendingRequests.length}</span>
                        </button>
                    </div>

                    {activeTab === 'all' ? (
                        <>
                            <div className={styles.searchBar}>
                                <Search size={18} className={styles.searchIcon} />
                                <input 
                                    type="text" 
                                    placeholder="Search your circle..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className={styles.friendsGrid}>
                                {filteredFriends.length > 0 ? (
                                    filteredFriends.map((friend, idx) => (
                                        <motion.div 
                                            key={friend.id}
                                            className={styles.friendCard}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <div className={styles.cardHeader}>
                                                <div className={styles.avatarWrap}>
                                                    <img src={friend.avatar_url} alt={friend.username} className={styles.realAvatar} />
                                                    <div className={clsx(styles.onlineIndicator, friend.is_online && styles.online)} />
                                                </div>
                                                <div className={styles.friendMeta}>
                                                    <h3>{friend.full_name || friend.username}</h3>
                                                    <span className={styles.username}>@{friend.username}</span>
                                                </div>
                                                <button className={styles.moreBtn}><MoreVertical size={18} /></button>
                                            </div>

                                            {/* Real Productivity Progress Bar */}
                                            <div className={styles.cardProgress}>
                                                <div className={styles.progressHeader}>
                                                    <span className={styles.progressLabel}>Productivity Pulse</span>
                                                    <span className={styles.progressValue}>{friend.productivity_score || 0}%</span>
                                                </div>
                                                <div className={styles.progressTrack}>
                                                    <motion.div 
                                                        className={styles.progressFill}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${friend.productivity_score || 0}%` }}
                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                    />
                                                </div>
                                                <div className={styles.statusBadgeRow}>
                                                    <p className={clsx(styles.statusText, friend.is_online ? styles.activeStatus : styles.idleStatus)}>
                                                        {friend.is_online ? (
                                                            <>
                                                                <span className={styles.pulseDot} />
                                                                {(friend.productivity_score || 0) > 70 ? 'In Deep Focus' : 'Online'}
                                                            </>
                                                        ) : 'Offline'}
                                                    </p>
                                                    {(friend.productivity_score || 0) > 85 && friend.is_online && (
                                                        <span className={styles.highProductivityTag}>🔥 God Mode</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={styles.cardActions}>
                                                <button className={styles.inviteBtn}>
                                                    <Headphones size={16} />
                                                    Study
                                                </button>
                                                <button 
                                                    className={styles.messageBtn}
                                                    onClick={() => window.location.href = `/messages/${friend.id}`}
                                                    title="Open Chat"
                                                >
                                                    <MessageSquare size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyIcon}><Users size={48} /></div>
                                        <h3>No soulmates found</h3>
                                        <p>Expand your circle by searching for friends or inviting your squad.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className={styles.requestsList}>
                            {pendingRequests.length > 0 ? (
                                pendingRequests.map(req => (
                                    <div key={req.id} className={styles.requestItem}>
                                        <div className={styles.reqInfo}>
                                            <img src={req.profiles.avatar_url} className={styles.reqAvatar} />
                                            <div>
                                                <p><b>@{req.profiles.username}</b> wants to be friends</p>
                                                <span>Sent recently</span>
                                            </div>
                                        </div>
                                        <div className={styles.reqActions}>
                                            <button onClick={() => acceptFriendRequest(req.id)} className={styles.acceptBtn}>Accept</button>
                                            <button className={styles.declineBtn}>Ignore</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>
                                    <Bell size={48} />
                                    <h3>No pending requests</h3>
                                    <p>When people add you by your username, they'll appear here.</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                <aside className={styles.sidebar}>
                    <div className={styles.sideCard}>
                        <div className={styles.sideCardHeader}>
                            <TrendingUp size={18} />
                            <h3>Network Leaderboard</h3>
                        </div>
                        <div className={styles.leaderboard}>
                            <div className={styles.leaderItem}>
                                <span>1</span>
                                <p>You</p>
                                <b>92%</b>
                            </div>
                            <p className={styles.leaderHint}>Complete tasks to climb the ranks!</p>
                        </div>
                    </div>

                    <div className={styles.inviteCard}>
                        <div className={styles.inviteEmoji}>🎁</div>
                        <h4>Invite to ESSENTIAL</h4>
                        <p>Share your unique invite link with friends.</p>
                        <div className={styles.copyLinkRow}>
                            <input readOnly value={`${window.location.origin}/join/${user?.username || ''}`} />
                            <button onClick={copyInviteLink} title="Copy Link"><Share2 size={16} /></button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
