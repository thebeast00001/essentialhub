'use client';

import React, { useEffect, useState } from 'react';
import { useTaskStore, Post, PostComment, UserProfile, UserProfileDetail } from '@/store/useTaskStore';
import { useAuth } from '@/hooks/useAuth';

import styles from '../Profile.module.css';
import { ArrowLeft, MessageSquare, ArrowUp, Clock, UserPlus, UserMinus, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UserProfilePage() {
    const { id: targetUserId } = useParams();
    const { user: currentUser } = useAuth();

    const { 
        fetchUserPosts, fetchUserComments, fetchUserProfile, toggleFollow, 
        following, fetchFollowing, votePost, onlineIds
    } = useTaskStore();
    
    const [profile, setProfile] = useState<UserProfileDetail | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [userComments, setUserComments] = useState<PostComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    const isMe = currentUser?.id === targetUserId;
    const isFollowing = following.some(f => f.id === targetUserId);

    useEffect(() => {
        if (!targetUserId) return;
        
        const loadData = async () => {
            setLoading(true);
            
            // 1. Fetch profile first for faster initial render
            const profileData = await fetchUserProfile(targetUserId as string);
            if (profileData) setProfile(profileData);
            
            // 2. Fetch posts and comments in parallel
            const [posts, comments] = await Promise.all([
                fetchUserPosts(targetUserId as string),
                fetchUserComments(targetUserId as string)
            ]);
            
            setUserPosts(posts);
            setUserComments(comments);
            fetchFollowing();
            setLoading(false);
        };

        loadData();

        // 3. Set up REAL-TIME subscription for this specific profile
        const channel = supabase.channel(`profile-${targetUserId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'posts', 
                filter: `user_id=eq.${targetUserId}` 
            }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    // Get full data for the new post
                    const { data } = await supabase
                        .from('posts')
                        .select('*, profiles!user_id(id, username, full_name, avatar_url, updated_at), post_votes(user_id, vote_type), comments(*, profiles!user_id(id, username, avatar_url), comment_votes(user_id, vote_type))')
                        .eq('id', payload.new.id)
                        .single();
                    if (data) {
                        const { userId, _mapPost } = useTaskStore.getState();
                        const mapped = _mapPost(data, userId);
                        setUserPosts(prev => [mapped, ...prev]);
                    }
                } else if (payload.eventType === 'DELETE') {
                    setUserPosts(prev => prev.filter(p => p.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
                   // Update existing post in state
                   const { data } = await supabase
                        .from('posts')
                        .select('*, profiles!user_id(id, username, full_name, avatar_url, updated_at), post_votes(user_id, vote_type), comments(*, profiles!user_id(id, username, avatar_url), comment_votes(user_id, vote_type))')
                        .eq('id', payload.new.id)
                        .single();
                    if (data) {
                        const { userId, _mapPost } = useTaskStore.getState();
                        const mapped = _mapPost(data, userId);
                        setUserPosts(prev => prev.map(p => p.id === mapped.id ? mapped : p));
                    }
                }
            })
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'comments', 
                filter: `user_id=eq.${targetUserId}` 
            }, async (payload) => {
                const refreshedComments = await fetchUserComments(targetUserId as string);
                setUserComments(refreshedComments);
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [targetUserId]);

    const handleToggleFollow = async () => {
        if (!targetUserId || isMe) return;
        setIsFollowLoading(true);
        await toggleFollow(targetUserId as string);
        const updatedProfile = await fetchUserProfile(targetUserId as string);
        setProfile(updatedProfile);
        setIsFollowLoading(false);
    };

    const handleVote = async (postId: string, voteType: number) => {
        // Optimistic update for local state
        const oldPosts = [...userPosts];
        const updated = userPosts.map(p => {
            if (p.id === postId) {
                const oldVote = p.userVote || 0;
                const newVote = oldVote === voteType ? 0 : voteType;
                const diff = newVote - oldVote;
                return { ...p, likes: (p.likes || 0) + diff, userVote: newVote };
            }
            return p;
        });
        setUserPosts(updated);

        try {
            await votePost(postId, voteType);
        } catch (err) {
            setUserPosts(oldPosts);
        }
    };

    if (loading) return (
        <div className={styles.container}>
            <div className={styles.layout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className={styles.loadingPulse}>Gathering pulse data...</div>
            </div>
        </div>
    );

    if (!profile) return (
        <div className={styles.container}>
            <div className={styles.layout} style={{ textAlign: 'center', padding: '100px 20px' }}>
                <h1>Profile Not Found</h1>
                <p>The user you are looking for doesn't exist in this circle.</p>
                <Link href="/friends" className={styles.backBtn} style={{ justifyContent: 'center', marginTop: '20px' }}>
                    <ArrowLeft size={20} /> Return to Social Circle
                </Link>
            </div>
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.layout}>
                <main>
                    <Link href="/friends" className={styles.backBtn}>
                        <ArrowLeft size={20} /> Back to Circle
                    </Link>

                    <div className={styles.profileHero}>
                        <div className={styles.cover} />
                        <div className={styles.profileInfo}>
                            <div className={clsx(styles.avatarWrapper, (onlineIds.includes(profile.id) || (profile.updated_at && (Date.now() - new Date(profile.updated_at).getTime() < 300000))) && styles.online)}>
                                <img src={profile.avatar_url} alt="" className={styles.largeAvatar} />
                            </div>
                            <div className={styles.details}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                    <h1>u/{profile.username}</h1>
                                    {!isMe && (
                                        <button 
                                            className={clsx(styles.followBtn, isFollowing ? styles.unfollowBtn : styles.primaryFollowBtn)}
                                            onClick={handleToggleFollow}
                                            disabled={isFollowLoading}
                                        >
                                            {isFollowLoading ? '...' : isFollowing ? <><UserMinus size={18} /> Following</> : <><UserPlus size={18} /> Follow</>}
                                        </button>
                                    )}
                                </div>
                                <p>{profile.full_name}</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.tabs}>
                        <button 
                            className={clsx(styles.tab, activeTab === 'posts' && styles.activeTab)} 
                            onClick={() => setActiveTab('posts')}
                        >
                            Pulses <span>{profile.postsCount}</span>
                        </button>
                        <button 
                            className={clsx(styles.tab, activeTab === 'comments' && styles.activeTab)} 
                            onClick={() => setActiveTab('comments')}
                        >
                            Replies <span>{userComments.length}</span>
                        </button>
                    </div>

                    <div className={styles.contentList}>
                        {activeTab === 'posts' ? (
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
                                                <button 
                                                    className={clsx(styles.statBtn, post.userVote === 1 && styles.upvoted)} 
                                                    onClick={() => handleVote(post.id, 1)}
                                                >
                                                    <ArrowUp size={16} /> <span>{post.likes}</span>
                                                </button>
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
                        <h4>Aura Stats</h4>
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <b>{profile.followersCount}</b>
                                <span>Followers</span>
                            </div>
                            <div className={styles.statItem}>
                                <b>{profile.followingCount}</b>
                                <span>Following</span>
                            </div>
                            <div className={styles.statItem}>
                                <b>{profile.productivity_score}</b>
                                <span>Aura Score</span>
                            </div>
                            <div className={styles.statItem}>
                                <b><Zap size={14} style={{ display: 'inline', marginRight: '4px' }} />{profile.postsCount}</b>
                                <span>Pulses</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.sideCard}>
                        <h4>Chronology</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Clock size={20} color="var(--text-muted)" />
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Circle Since</div>
                                    <div style={{ fontWeight: '700' }}>{new Date(profile.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
