'use client';

import React, { useEffect, useState } from 'react';
import { useTaskStore, Post, PostComment } from '@/store/useTaskStore';
import { useAuth } from '@/hooks/useAuth';

import styles from './Profile.module.css';
import { ArrowLeft, MessageSquare, ArrowUp, Share2, Layers, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

export default function ProfilePage() {
    const { user } = useAuth();

    const { fetchUserPosts, fetchUserComments, followers, following, fetchFollowers, fetchFollowing } = useTaskStore();
    
    const [socialModalType, setSocialModalType] = useState<'followers' | 'following' | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [userComments, setUserComments] = useState<PostComment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        
        const loadData = async () => {
            setLoading(true);
            const [posts, comments] = await Promise.all([
                fetchUserPosts(user.id),
                fetchUserComments(user.id)
            ]);
            setUserPosts(posts);
            setUserComments(comments);
            fetchFollowers();
            fetchFollowing();
            setLoading(false);
        };

        loadData();
    }, [user]);

    const handleToggleFollow = async (targetId: string) => {
        await useTaskStore.getState().toggleFollow(targetId);
        fetchFollowing(); // Refresh following list
        fetchFollowers(); // Refresh followers list just in case
    };

    if (!user) return null;

    return (
        <div className={styles.container}>
            {/* Social Modal */}
            <AnimatePresence>
                {socialModalType && (
                    <div className={styles.socialModalOverlay} onClick={() => setSocialModalType(null)}>
                        <motion.div 
                            className={styles.socialModal} 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles.socialModalHeader}>
                                <h3>{socialModalType === 'followers' ? 'Followers' : 'Following'}</h3>
                                <button onClick={() => setSocialModalType(null)} className={styles.closeModalBtn}>×</button>
                            </div>
                            <div className={styles.socialModalList}>
                                {(socialModalType === 'followers' ? followers : following).map(u => (
                                    <div key={u.id} className={styles.socialUserItem}>
                                        <img src={u.avatar_url} alt="" className={styles.socialUserAvatar} />
                                        <div className={styles.socialUserInfo}>
                                            <h5>{u.full_name}</h5>
                                            <p>@{u.username}</p>
                                        </div>
                                        {u.id !== user?.id && (
                                            <button 
                                                className={clsx(styles.followToggleBtn, following.some(f => f.id === u.id) ? styles.followBtnInactive : styles.followBtnActive)}
                                                onClick={() => handleToggleFollow(u.id)}
                                            >
                                                {following.some(f => f.id === u.id) ? 'Following' : 
                                                    (socialModalType === 'followers' ? 'Follow back' : 'Follow')}
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {(socialModalType === 'followers' ? followers : following).length === 0 && (
                                    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                                        No one here yet.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <div className={styles.layout}>
                <main>
                    <Link href="/friends" className={styles.backBtn}>
                        <ArrowLeft size={20} /> Back to Circle
                    </Link>

                    <div className={styles.profileHero}>
                        <div className={styles.cover} />
                        <div className={styles.profileInfo}>
                            <img src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email || 'U'}&background=1A1A1A&color=fff`} alt="" className={styles.largeAvatar} />

                            <div className={styles.details}>
                                <h1>{user.user_metadata?.full_name || user.email?.split('@')[0]}</h1>
                                <p>@{user.user_metadata?.username || user.email?.split('@')[0]}</p>

                            </div>
                        </div>
                    </div>

                    <div className={styles.tabs}>
                        <button 
                            className={clsx(styles.tab, activeTab === 'posts' && styles.activeTab)} 
                            onClick={() => setActiveTab('posts')}
                        >
                            Posts
                        </button>
                        <button 
                            className={clsx(styles.tab, activeTab === 'comments' && styles.activeTab)} 
                            onClick={() => setActiveTab('comments')}
                        >
                            Comments
                        </button>
                    </div>

                    <div className={styles.contentList}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>Loading pulse history...</div>
                        ) : activeTab === 'posts' ? (
                            userPosts.length > 0 ? (
                                userPosts.map(post => (
                                    <motion.div key={post.id} className={styles.postCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <div className={styles.postMeta}>
                                            <span>{formatDistanceToNow(new Date(post.time))} ago</span>
                                        </div>
                                        <div className={styles.postBody}>
                                            <p>{post.content}</p>
                                            {post.image && <img src={post.image} alt="" className={styles.postImage} />}
                                        </div>
                                        <div className={styles.postFooter}>
                                            <div className={styles.engagement}>
                                                <div className={styles.stat}><ArrowUp size={16} /> <span>{post.likes}</span></div>
                                                <div className={styles.stat}><MessageSquare size={16} /> <span>{post.commentsCount}</span></div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>No pulses shared yet.</div>
                            )
                        ) : (
                            userComments.length > 0 ? (
                                userComments.map(comment => (
                                    <motion.div key={comment.id} className={styles.commentCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <div className={styles.commentMeta}>
                                            <span>Commented {formatDistanceToNow(new Date(comment.time))} ago</span>
                                        </div>
                                        <p className={styles.commentContent}>{comment.content}</p>
                                        <div className={styles.commentFooter}>
                                            <div className={styles.stat}><ArrowUp size={14} /> <span>{comment.likes}</span></div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>No replies recorded.</div>
                            )
                        )}
                    </div>
                </main>

                <aside className={styles.sidebar}>
                    <div className={styles.sideCard}>
                        <h4>Social Pulse</h4>
                        <div className={styles.statsGrid}>
                            <div className={clsx(styles.statItem, styles.clickable)} onClick={() => setSocialModalType('followers')}>
                                <b>{followers.length}</b>
                                <span>Followers</span>
                            </div>
                            <div className={clsx(styles.statItem, styles.clickable)} onClick={() => setSocialModalType('following')}>
                                <b>{following.length}</b>
                                <span>Following</span>
                            </div>
                            <div className={styles.statItem}>
                                <b>{userPosts.length}</b>
                                <span>Total Pulses</span>
                            </div>
                            <div className={styles.statItem}>
                                <b>{userComments.length}</b>
                                <span>Responses</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.sideCard}>
                        <h4>Account Stats</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Clock size={20} color="var(--text-muted)" />
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Circle Since</div>
                                    <div style={{ fontWeight: '700' }}>{new Date(user.created_at).toLocaleDateString()}</div>

                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
