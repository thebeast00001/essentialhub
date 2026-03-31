"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Image as ImageIcon, Video, 
    BarChart2, Globe, Heart, MessageCircle, 
    Share2, Bookmark, MoreHorizontal, 
    Plus, UserPlus, Hash, Bell, 
    ChevronDown, Send, ArrowUp, ArrowDown,
    Smile, Activity, Users, Settings, Trash2,
    TrendingUp, Award, Zap, CornerDownRight, X, Clock, Flame, Palette, Type, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import styles from './Friends.module.css';
import { clsx } from 'clsx';
import { useTaskStore, PostComment, Story, UserProfile } from '@/store/useTaskStore';

import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';


const QUICK_REACTIONS = ['🔥', '💯', '👏', '🚀', '❤️', '🤯'];

const STORY_BGS = [
    'linear-gradient(135deg, #FF6B6B, #FFD93D)', // Sunset
    'linear-gradient(135deg, #4facfe, #00f2fe)', // Ocean
    'linear-gradient(135deg, #667eea, #764ba2)', // Purple Rain
    'linear-gradient(135deg, #00b09b, #96c93d)', // Fresh
    'linear-gradient(135deg, #ee9ca7, #ffdde1)', // Rose
    'linear-gradient(135deg, #232526, #414345)', // Onyx
    'linear-gradient(135deg, #B24592, #F15F79)', // Cosmic
    'linear-gradient(135deg, #8E2DE2, #4A00E0)', // Deep Violet
    'linear-gradient(135deg, #00c6ff, #0072ff)', // Blue Sky
    'linear-gradient(135deg, #f953c6, #b91d73)', // Pinky
    '#FF5733', '#33FF57', '#3357FF', '#F333FF'
];

const STORY_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#ADFF2F', '#00FFFF', '#FF69B4', '#FFA500'];

const STORY_FONTS = [
    { name: 'Modern', family: "'Inter', sans-serif" },
    { name: 'Classic', family: "'Georgia', serif" },
    { name: 'Playful', family: "'Comic Sans MS', cursive" },
    { name: 'Elite', family: "'Orbitron', sans-serif" },
    { name: 'Minimal', family: "'Space Mono', monospace" },
    { name: 'Grand', family: "'Playfair Display', serif" },
    { name: 'Action', family: "'Anton', sans-serif" }
];


export default function SocialCircle() {
    const { 
        friends, fetchFriends, addFriendByUsername, acceptFriendRequest, 
        pendingRequests, posts, fetchPosts, createPost, votePost, addComment, voteComment, deletePost,
        socialStats, loadingPosts, suggestedUsers,
        stories, fetchStories, createStory, deleteStory, addStoryReaction, loadingStories,
        followers, following, fetchFollowers, fetchFollowing, toggleFollow
    } = useTaskStore();
    
    const { user: authUser } = useAuth();
    
    const user = { 
        id: authUser?.id || 'temp-user',
        imageUrl: authUser?.user_metadata?.avatar_url || undefined,
        fullName: authUser?.user_metadata?.full_name || 'User',
        username: authUser?.user_metadata?.username || authUser?.email?.split('@')[0] || 'user'
    };

    
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState('new');
    const [postText, setPostText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPost, setExpandedPost] = useState<string | null>(null);
    const [commentTexts, setCommentTexts] = useState<{[key: string]: string}>({});
    const [replyingTo, setReplyingTo] = useState<{[key: string]: PostComment | null}>({});
    const [isPosting, setIsPosting] = useState(false);

    // Stories State
    const [isCreatingStory, setIsCreatingStory] = useState(false);
    const [storyText, setStoryText] = useState('');
    const [storyMedia, setStoryMedia] = useState<string | null>(null);
    const [viewingStoryUser, setViewingStoryUser] = useState<string | null>(null);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [floatingEmojis, setFloatingEmojis] = useState<{ id: number, emoji: string, x: number }[]>([]);

    // Story Customization
    const [storyBg, setStoryBg] = useState(STORY_BGS[0]);
    const [storyColor, setStoryColor] = useState(STORY_COLORS[0]);
    const [storyFont, setStoryFont] = useState(STORY_FONTS[0].family);

    // Social Modals
    const [socialModalType, setSocialModalType] = useState<'followers' | 'following' | null>(null);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Seen Stories tracking
    const [seenStories, setSeenStories] = useState<Set<string>>(new Set());

    // User Search State
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [searchStatus, setSearchStatus] = useState<{ type: 'success' | 'error' | 'loading' | null, message: string }>({ type: null, message: '' });

    useEffect(() => {
        const stored = localStorage.getItem('zenith_seen_stories_v2');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setSeenStories(new Set(parsed));
            } catch (e) { console.error("Failed to parse seen stories", e); }
        }
    }, []);

    useEffect(() => {
        if (seenStories.size > 0) {
            localStorage.setItem('zenith_seen_stories_v2', JSON.stringify(Array.from(seenStories)));
        }
    }, [seenStories]);

    // Body scroll lock
    useEffect(() => {
        if (viewingStoryUser) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [viewingStoryUser]);



    useEffect(() => {
        setMounted(true);
        fetchFriends();
        fetchPosts();
        fetchStories();
        fetchFollowers();
        fetchFollowing();
    }, [fetchFriends, fetchPosts, fetchStories, fetchFollowers, fetchFollowing]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStoryMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setStoryMedia(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreatePost = async () => {
        if (!postText.trim() && !imagePreview) return;
        setIsPosting(true);
        try {
            await createPost(postText, imagePreview || undefined);
            setPostText('');
            setImageFile(null);
            setImagePreview(null);
        } finally {
            setIsPosting(false);
        }
    };

    const handleCreateStory = async () => {
        if (!storyMedia && !storyText.trim()) return;
        const metadata = {
            bg: !storyMedia ? storyBg : undefined,
            color: !storyMedia ? storyColor : undefined,
            font: !storyMedia ? storyFont : undefined
        };
        await createStory(storyText, storyMedia || undefined, storyMedia ? 'image' : 'text', metadata);
        setIsCreatingStory(false);
        setStoryText('');
        setStoryMedia(null);
    };

    const handleStoryReaction = (storyId: string, emoji: string) => {
        addStoryReaction(storyId, emoji);
        const id = Date.now();
        const x = 30 + Math.random() * 40;
        setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(e => e.id !== id));
        }, 1500);
    };

    const handleSearchUser = async () => {
        if (!userSearchTerm.trim()) return;
        setSearchStatus({ type: 'loading', message: 'Searching...' });
        const result = await addFriendByUsername(userSearchTerm);
        if (result.success) {
            setSearchStatus({ type: 'success', message: result.message });
            setUserSearchTerm('');
        } else {
            setSearchStatus({ type: 'error', message: result.message });
        }
        setTimeout(() => setSearchStatus({ type: null, message: '' }), 5000);
    };


    const handleCommentSubmit = async (postId: string) => {
        const text = commentTexts[postId];
        if (!text?.trim()) return;
        const parentId = replyingTo[postId]?.id;
        await addComment(postId, text, parentId);
        setCommentTexts({ ...commentTexts, [postId]: '' });
        setReplyingTo({ ...replyingTo, [postId]: null });
    };

    const filteredPosts = useMemo(() => {
        let list = posts || [];
        if (activeTab === 'new') list = [...list].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        if (activeTab === 'explore') list = [...list].sort((a, b) => (b.likes || 0) - (a.likes || 0));
        if (searchTerm.trim()) {
            const lowSearch = searchTerm.toLowerCase();
            list = list.filter(p => 
                p.content.toLowerCase().includes(lowSearch) || 
                p.author?.username?.toLowerCase().includes(lowSearch) ||
                p.author?.full_name?.toLowerCase().includes(lowSearch)
            );

        }
        return list;
    }, [posts, searchTerm, activeTab]);

    const usersWithStories = useMemo(() => {
        const usersMap: {[key: string]: Story[]} = {};
        stories.forEach(s => {
            if (!usersMap[s.userId]) usersMap[s.userId] = [];
            usersMap[s.userId].push(s);
        });
        return usersMap;
    }, [stories]);

    const activeUserStories = viewingStoryUser ? usersWithStories[viewingStoryUser] : [];

    // Mark current story as seen instantly
    useEffect(() => {
        if (viewingStoryUser && activeUserStories && activeUserStories[currentStoryIndex]) {
            const storyId = activeUserStories[currentStoryIndex].id;
            setSeenStories(prev => {
                if (prev.has(storyId)) return prev;
                return new Set(prev).add(storyId);
            });
        }
    }, [viewingStoryUser, currentStoryIndex, activeUserStories]);

    const formatContent = (content: string) => {
        return content.split(/(\s+)/).map((part, i) => {
            if (part.startsWith('#')) return <span key={i} className={styles.hashtag}>{part}</span>;
            if (part.startsWith('@')) return <span key={i} className={styles.mention}>{part}</span>;
            return part;
        });
    };

    const renderComments = (postId: string, allComments: PostComment[], postAuthorId: string, parentId: string | null = null, depth = 0) => {
        if (!allComments || !Array.isArray(allComments)) return null;
        const filtered = allComments.filter(c => (parentId === null ? !c.parentId : c.parentId === parentId));
        return filtered.map(comment => (
            <div key={comment.id} className={clsx(styles.threadItem, depth > 0 && styles.nestedThread)}>
                <Link href={`/profile/${comment.author?.id}`} className={clsx(styles.tinyAvatarWrapper, comment.author?.is_online && styles.online)}>
                    <img src={comment.author?.avatar || undefined} alt="" className={styles.tinyAvatar} />
                </Link>
                <div className={styles.threadContent}>
                    <div className={styles.threadAuthor}>
                        <Link href={`/profile/${comment.author?.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <b>u/{comment.author?.username}</b>
                        </Link>
                        {comment.author?.id === postAuthorId && <span className={styles.authorBadge}>OP</span>}
                    </div>
                    <p>{comment.content}</p>
                    <div className={styles.threadActions}>
                        <div className={styles.voting}>
                            <button className={clsx(styles.voteBtn, comment.userVote === 1 && styles.votedUp)} onClick={() => voteComment(comment.id, 1)}><ArrowUp size={14} /></button>
                            <motion.span key={comment.likes} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{comment.likes}</motion.span>
                            <button className={clsx(styles.voteBtn, comment.userVote === -1 && styles.votedDown)} onClick={() => voteComment(comment.id, -1)}><ArrowDown size={14} /></button>
                        </div>
                        <button className={styles.replyBtn} onClick={() => setReplyingTo({ ...replyingTo, [postId]: comment })}>Reply</button>
                    </div>
                    {renderComments(postId, allComments, postAuthorId, comment.id, depth + 1)}
                </div>
            </div>
        ));
    };

    if (!mounted) return null;

    return (
        <div className={styles.container}>
            <div className={styles.layout}>
                {/* Followers/Following Modal */}
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
                                    <button onClick={() => setSocialModalType(null)} className={styles.closeModalBtn}><X size={20} /></button>
                                </div>
                                <div className={styles.socialModalList}>
                                    {(socialModalType === 'followers' ? followers : following).map(u => (
                                        <div key={u.id} className={styles.socialUserItem}>
                                            <Link href={`/profile/${u.id}`} className={clsx(styles.socialUserLink, u.is_online && styles.online)}>
                                                <img src={u.avatar_url || undefined} alt="" className={styles.socialUserAvatar} />
                                            </Link>
                                            <div className={styles.socialUserInfo}>
                                                <Link href={`/profile/${u.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                    <h5>{u.full_name}</h5>
                                                    <p>@{u.username}</p>
                                                </Link>
                                            </div>
                                            {u.id !== user?.id && (
                                                <button 
                                                    className={clsx(styles.followToggleBtn, following.some(f => f.id === u.id) ? styles.followBtnInactive : styles.followBtnActive)}
                                                    onClick={() => toggleFollow(u.id)}
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

                {/* Story Creator */}
                <AnimatePresence>
                    {isCreatingStory && (
                        <div className={styles.socialModalOverlay} onClick={() => setIsCreatingStory(false)}>
                            <motion.div 
                                className={styles.storyCreatorModal} 
                                initial={{ opacity: 0, y: 50, scale: 0.95 }} 
                                animate={{ opacity: 1, y: 0, scale: 1 }} 
                                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className={styles.storyCreatorHeader}>
                                    <h3>New Aura Pulse</h3>
                                    <button onClick={() => setIsCreatingStory(false)} className={styles.closeModalBtn}><X size={20} /></button>
                                </div>
                                <div className={styles.storyCreatorBody}>
                                    {!storyMedia && (
                                        <div className={styles.customizationGroups}>
                                            <div className={styles.customizationGroup}>
                                                <label><Palette size={12} /> Background</label>
                                                <div className={styles.pickerList}>
                                                    {STORY_BGS.map(bg => (
                                                        <div key={bg} className={clsx(styles.swatch, storyBg === bg && styles.active)} style={{ background: bg }} onClick={() => setStoryBg(bg)} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className={styles.customizationGroup}>
                                                <label><Clock size={12} /> Text Color</label>
                                                <div className={styles.pickerList}>
                                                    {STORY_COLORS.map(c => (
                                                        <div key={c} className={clsx(styles.swatch, storyColor === c && styles.active)} style={{ backgroundColor: c }} onClick={() => setStoryColor(c)} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className={styles.customizationGroup}>
                                                <label><Type size={12} /> Font Style</label>
                                                <div className={styles.pickerList}>
                                                    {STORY_FONTS.map(f => (
                                                        <button key={f.name} className={clsx(styles.fontBtn, storyFont === f.family && styles.active)} style={{ fontFamily: f.family }} onClick={() => setStoryFont(f.family)}>{f.name}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <textarea 
                                        placeholder="Captivate your circle..." 
                                        value={storyText} 
                                        onChange={(e) => setStoryText(e.target.value)} 
                                        className={styles.storyTextArea} 
                                        style={{ 
                                            background: !storyMedia ? storyBg : 'var(--bg-deep)',
                                            color: !storyMedia ? storyColor : 'var(--text-primary)',
                                            fontFamily: !storyMedia ? storyFont : 'inherit',
                                            textAlign: !storyMedia ? 'center' : 'left',
                                            fontSize: !storyMedia ? '1.5rem' : '1rem'
                                        }}
                                    />
                                    <div className={styles.storyUploadArea}>
                                        {storyMedia ? (
                                            <div className={styles.storyPreview}><img src={storyMedia} alt="" /><button onClick={() => setStoryMedia(null)}>Remove</button></div>
                                        ) : (
                                            <label className={styles.storyLabel}><ImageIcon size={24} /><span>Add Photo Pulse</span><input type="file" hidden accept="image/*" onChange={handleStoryMediaChange} /></label>
                                        )}
                                    </div>
                                    <button className={styles.storySubmit} onClick={handleCreateStory} disabled={!storyMedia && !storyText.trim()}>Radiate Pulse</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Story Viewer */}
                <AnimatePresence>
                    {viewingStoryUser && activeUserStories && activeUserStories.length > 0 && (
                        <motion.div 
                            className={styles.storyOverlay} 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            key="viewer"
                        >
                            <div className={styles.storyMesh} />
                            
                            {/* Cinematic Background Blur */}
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={`blur-${activeUserStories[currentStoryIndex]?.id}`}
                                    className={styles.storyContentBlur}
                                    style={{ 
                                        backgroundImage: activeUserStories[currentStoryIndex]?.mediaUrl ? `url(${activeUserStories[currentStoryIndex].mediaUrl})` : 'none',
                                        background: !activeUserStories[currentStoryIndex]?.mediaUrl ? (activeUserStories[currentStoryIndex]?.metadata?.bg || '#000') : undefined
                                    }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.6 }}
                                    exit={{ opacity: 0 }}
                                />
                            </AnimatePresence>

                            <motion.div 
                                className={styles.storyContainer}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >



                                {floatingEmojis.map(fe => (
                                    <span key={fe.id} className={styles.floatingReaction} style={{ left: `${fe.x}%` }}>{fe.emoji}</span>
                                ))}

                                              <div className={styles.storyProgressBar}>
                                    {activeUserStories.map((_, i) => (
                                        <div key={i} className={styles.progressSegment}>
                                            <motion.div 
                                                className={styles.progressFill} 
                                                initial={{ width: 0 }} 
                                                animate={{ width: i === currentStoryIndex ? '100%' : i < currentStoryIndex ? '100%' : '0%' }}
                                                transition={{ duration: i === currentStoryIndex ? 5 : 0, ease: 'linear' }}
                                                onAnimationComplete={() => {
                                                    if (i === currentStoryIndex) {
                                                        if (currentStoryIndex < activeUserStories.length - 1) setCurrentStoryIndex(prev => prev + 1);
                                                        else { setViewingStoryUser(null); setCurrentStoryIndex(0); }
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                
                                 <div className={styles.storyHeader}>
                                     <img src={activeUserStories[currentStoryIndex]?.author?.avatar || undefined} alt="" className={styles.storyAvatar} />
                                     <div className={styles.storyAuthorInfo}>
                                         <h4>{activeUserStories[currentStoryIndex]?.author?.username}</h4>
                                         <span>{activeUserStories[currentStoryIndex] ? formatDistanceToNow(new Date(activeUserStories[currentStoryIndex].createdAt)) : ''} ago</span>
                                     </div>
                                     <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                         {activeUserStories[currentStoryIndex]?.userId === user?.id && (
                                             <button className={styles.deleteStoryBtn} onClick={() => deleteStory(activeUserStories[currentStoryIndex].id)}><Trash2 size={18} /></button>
                                         )}
                                         <button className={styles.closeStory} onClick={() => setViewingStoryUser(null)}><X size={24} /></button>
                                     </div>
                                 </div>

                                
                                 <motion.div 
                                    key={`${viewingStoryUser}-${currentStoryIndex}`} 
                                    initial={{ opacity: 0, scale: 1.05 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    exit={{ opacity: 0, scale: 0.95 }} 
                                    style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
                                >
                                    {activeUserStories[currentStoryIndex] ? (

                                        <>
                                            {activeUserStories[currentStoryIndex].mediaUrl ? (
                                                <img src={activeUserStories[currentStoryIndex].mediaUrl} className={styles.storyMedia} alt="" />
                                            ) : activeUserStories[currentStoryIndex].type === 'wrap' ? (
                                                <div className={styles.wrapStoryContent} style={{ background: WRAP_THEMES.find(t => t.id === (activeUserStories[currentStoryIndex].metadata as any)?.theme)?.bg || '#000' }}>
                                                     <div className={styles.wrapBranding}><Zap size={14} /> ESSENTIAL WRAPPED</div>
                                                     <div className={styles.wrapMain}>
                                                         <div className={styles.wrapTopSection}>
                                                             <div className={styles.wrapLabel}>DAILY PERFORMANCE</div>
                                                             <div className={styles.wrapValue} style={{ color: WRAP_THEMES.find(t => t.id === (activeUserStories[currentStoryIndex].metadata as any)?.theme)?.accent || '#fff' }}>
                                                                 {(activeUserStories[currentStoryIndex].metadata as any)?.productivity}%
                                                             </div>
                                                             <div className={styles.wrapDesc}>Productivity Score</div>
                                                         </div>
                                                         
                                                         <div className={styles.wrapGrid}>
                                                             <div className={styles.wrapGridItem}>
                                                                 <div className={styles.gridVal}>{(activeUserStories[currentStoryIndex].metadata as any)?.focusTime}m</div>
                                                                 <div className={styles.gridLab}>Focus</div>
                                                             </div>
                                                             <div className={styles.wrapGridItem}>
                                                                 <div className={styles.gridVal}>{(activeUserStories[currentStoryIndex].metadata as any)?.tasksDone}</div>
                                                                 <div className={styles.gridLab}>Tasks</div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                </div>
                                            ) : (
                                                <div className={styles.storyTextContent} style={{ 
                                                    background: activeUserStories[currentStoryIndex].metadata?.bg || STORY_BGS[0],
                                                    color: activeUserStories[currentStoryIndex].metadata?.color || '#FFFFFF',
                                                    fontFamily: activeUserStories[currentStoryIndex].metadata?.font || STORY_FONTS[0].family
                                                }}>
                                                    {activeUserStories[currentStoryIndex].content}
                                                </div>
                                            )}
                                        </>
                                    ) : null}


                                </motion.div>


                                 <div className={styles.storyFooter}>
                                    {activeUserStories[currentStoryIndex]?.mediaUrl && activeUserStories[currentStoryIndex]?.content && (
                                        <p className={styles.storyCaptionText}>{activeUserStories[currentStoryIndex].content}</p>
                                    )}


                                     <div className={styles.storyQuickReactions}>
                                        {QUICK_REACTIONS.map(emoji => (
                                            <button 
                                                key={emoji} 
                                                className={clsx(styles.storyReactionBtn, activeUserStories[currentStoryIndex]?.userReactions?.includes(emoji) && styles.activeReaction)}
                                                onClick={() => activeUserStories[currentStoryIndex] && handleStoryReaction(activeUserStories[currentStoryIndex].id, emoji)}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>

                                    <div className={styles.storyCounts}>
                                        {activeUserStories[currentStoryIndex] && Object.entries(activeUserStories[currentStoryIndex].reactions || {}).map(([emoji, count]) => (
                                            <div key={emoji} className={styles.storyCountItem}>
                                                <span>{emoji}</span> <span>{count}</span>
                                            </div>
                                        ))}
                                    </div>

                                </div>
                                
                                <div className={styles.storyNavLeft} onClick={() => setCurrentStoryIndex(Math.max(0, currentStoryIndex - 1))} />
                                <div className={styles.storyNavRight} onClick={() => {
                                    if (currentStoryIndex < activeUserStories.length - 1) setCurrentStoryIndex(currentStoryIndex + 1);
                                    else setViewingStoryUser(null);
                                }} />
                            </motion.div>
                        </motion.div>

                    )}
                </AnimatePresence>

                {/* Left Col */}
                <aside className={styles.leftCol}>
                    <div className={styles.profileCard}>
                        <div className={styles.profileCover} />
                        <div className={styles.profileHeader}>
                            <div className={clsx(styles.largeAvatarWrapper, styles.online)}>
                                <img src={user?.imageUrl || undefined} className={styles.largeAvatar} alt="" />
                            </div>
                            <Link href="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <h3>u/{user?.username || 'user'}</h3>
                                <p>{user?.fullName}</p>
                            </Link>
                        </div>
                        <div className={styles.profileStats}>
                            <div className={styles.stat}><b>{socialStats.posts}</b><span>Post</span></div>
                            <div className={clsx(styles.stat, styles.statClickable)} onClick={() => setSocialModalType('followers')}><b>{followers.length}</b><span>Followers</span></div>
                            <div className={clsx(styles.stat, styles.statClickable)} onClick={() => setSocialModalType('following')}><b>{following.length}</b><span>Following</span></div>
                        </div>
                    </div>
                    <div className={styles.navMenu}>
                        <button className={clsx(styles.menuItem, activeTab === 'new' && styles.activeMenu)} onClick={() => setActiveTab('new')}><Activity size={20} /><span>New</span></button>
                        <button className={clsx(styles.menuItem, activeTab === 'explore' && styles.activeMenu)} onClick={() => setActiveTab('explore')}><TrendingUp size={20} /><span>Trending</span></button>
                    </div>
                </aside>

                {/* Middle Col */}
                <main className={styles.middleCol}>
                    <div className={styles.pageHero}>
                        <h1 className={styles.heroTitle}>Social <span>Circle</span></h1>
                        <p className={styles.heroSub}>Connect with friends worldwide.</p>
                    </div>

                    <div className={styles.storiesWrapper}>
                        <div className={styles.addStory} onClick={() => setIsCreatingStory(true)}>
                            <div className={styles.plusCircle}><Plus size={20} /></div>
                            <span>Add Aura</span>
                        </div>
                        {user && usersWithStories[user.id] && (
                             <div className={styles.storyWrap} onClick={() => { setViewingStoryUser(user.id); setCurrentStoryIndex(0); }}>
                                <div className={clsx(
                                    styles.auraRing, 
                                    styles.hasStory,
                                    usersWithStories[user.id]?.every(s => seenStories.has(s.id)) && styles.seenStory
                                )}>
                                    <img src={user.imageUrl || undefined} alt="" />
                                </div>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>u/{user.username}</span>
                             </div>
                        )}
                        {following.filter(u => usersWithStories[u.id]).map(u => {
                            const userStories = usersWithStories[u.id] || [];
                            const allSeen = userStories.every(s => seenStories.has(s.id));
                            return (
                                <div key={u.id} className={styles.storyWrap} onClick={() => { setViewingStoryUser(u.id); setCurrentStoryIndex(0); }}>
                                    <div 
                                        className={clsx(
                                            styles.auraRing, 
                                            u.is_online && styles.online, 
                                            styles.hasStory,
                                            allSeen && styles.seenStory
                                        )}
                                    >
                                        <img src={u.avatar_url || undefined} alt="" />
                                    </div>
                                    <span>u/{u.username}</span>
                                </div>
                            );
                        })}


                    </div>

                    <div className={styles.composerCard}>
                        <div className={styles.composerHeader}>
                            <img src={user?.imageUrl || undefined} className={styles.miniAvatar} alt="" />
                            <div className={styles.composerInputWrapper}>
                                <textarea placeholder="What's your focus today?" value={postText} onChange={(e) => setPostText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCreatePost(); }} />
                                {imagePreview && <div className={styles.previewContainer}><img src={imagePreview} alt="" /><button onClick={() => { setImageFile(null); setImagePreview(null); }}>×</button></div>}
                            </div>
                        </div>
                        <div className={styles.composerActions}>
                            <div className={styles.mediaBtns}>
                                <input type="file" id="composer-image" hidden accept="image/*" onChange={handleImageChange} />
                                <button className={styles.mediaBtn} onClick={() => document.getElementById('composer-image')?.click()}><ImageIcon size={18} /><span>Image</span></button>
                            </div>
                            <div className={styles.postSubmitWrap}><button className={styles.postSubmit} disabled={(!postText.trim() && !imagePreview) || isPosting} onClick={handleCreatePost}>{isPosting ? 'Posting...' : 'Share Pulse'}</button></div>
                        </div>
                    </div>

                    <div className={styles.feedFilter}>
                        <div className={styles.searchWrapper}><Search size={16} /><input type="text" placeholder="Search the circle..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    </div>

                    <div className={styles.feedList}>
                        {!loadingPosts && filteredPosts && filteredPosts.map((post: any) => (
                            <motion.div key={post.id} className={styles.postCard} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className={styles.postHeader}>
                                    <div className={styles.postAuthor}>
                                        <Link href={`/profile/${post.author?.id}`}>
                                            <div className={clsx(styles.smallAura, post.author?.is_online && styles.online)}><img src={post.author?.avatar || undefined} alt="" /></div>
                                        </Link>
                                        <Link href={`/profile/${post.author?.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div className={styles.authorMeta}><h5>u/{post.author?.username || post.author?.full_name}</h5></div>
                                        </Link>
                                    </div>
                                    {post.author?.id === user?.id && <button className={styles.deletePostBtn} onClick={() => deletePost(post.id)}><Trash2 size={18} /></button>}

                                </div>
                                <div className={styles.postBody}>
                                    <div className={styles.postContent}>{formatContent(post.content)}</div>
                                    {post.image && <div className={styles.postImageWrap}><img src={post.image} alt="" /></div>}
                                </div>
                                <div className={styles.postFooter}>
                                    <div className={styles.engagementRow}>
                                        <div className={styles.mainEngagement}>
                                            <button className={clsx(styles.engageVoteBtn, post.userVote === 1 && styles.upvoted)} onClick={() => votePost(post.id, 1)}><ArrowUp size={18} /></button>
                                            <span className={styles.voteCount}>{post.likes}</span>
                                            <button className={clsx(styles.engageVoteBtn, post.userVote === -1 && styles.downvoted)} onClick={() => votePost(post.id, -1)}><ArrowDown size={18} /></button>
                                            <div style={{ width: '1px', height: '16px', background: 'var(--border-glass)', margin: '0 4px' }} />
                                            <button className={clsx(styles.engageVoteBtn, expandedPost === post.id && styles.activeEngage)} onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}>
                                                <MessageCircle size={18} />
                                                <span>{post.commentsCount}</span>
                                            </button>
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {expandedPost === post.id && (
                                            <motion.div className={styles.threadsArea} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                                {replyingTo[post.id] && (
                                                    <div className={styles.replyingToBar}><CornerDownRight size={14} /><span>Replying to <b>@{replyingTo[post.id]?.author?.username}</b></span><button onClick={() => setReplyingTo({ ...replyingTo, [post.id]: null })}>Cancel</button></div>
                                                )}

                                                <div className={styles.commentInputWrap}>
                                                    <img src={user?.imageUrl || undefined} className={styles.tinyAvatar} alt="" />
                                                    <input type="text" placeholder={replyingTo[post.id] ? "Write your reply..." : "Add a pulse... (Press Enter)"} value={commentTexts[post.id] || ''} onChange={(e) => setCommentTexts({...commentTexts, [post.id]: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') handleCommentSubmit(post.id); }} autoFocus />
                                                </div>
                                                <div className={styles.threadsList}>{renderComments(post.id, post.comments, post.author?.id || '')}</div>

                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </main>

                <aside className={styles.rightCol}>

                    <div className={styles.activityCard}>
                        <div className={styles.cardHeader}><h4>Find New Friends</h4></div>
                        <div className={styles.searchUserBox}>
                            <div className={styles.searchUserInputWrapper}>
                                <Search size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Enter username..." 
                                    value={userSearchTerm}
                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                                />
                                <button 
                                    className={styles.addBtn} 
                                    onClick={handleSearchUser}
                                    disabled={!userSearchTerm.trim() || searchStatus.type === 'loading'}
                                >
                                    {searchStatus.type === 'loading' ? '...' : <UserPlus size={18} />}
                                </button>
                            </div>
                            <AnimatePresence>
                                {searchStatus.type && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={clsx(styles.searchStatus, styles[searchStatus.type])}
                                    >
                                        {searchStatus.message}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className={styles.activityCard}>
                        <div className={styles.cardHeader}><h4>Circle Alerts</h4></div>
                        <div className={styles.activityList}>
                            {pendingRequests.length > 0 ? pendingRequests.map((req: any) => (
                                <div key={req.id} className={styles.activityItem}><img src={req.profiles.avatar_url || undefined} className={styles.miniAvatar} alt="" /><div className={styles.activityText}><p><b>@{req.profiles.username}</b> wants to connect</p><button className={styles.followBtn} onClick={() => acceptFriendRequest(req.id)}>Accept</button></div></div>
                            )) : <div className={styles.emptySuggest}><Bell size={32} opacity={0.3} /><p>No new pulses</p></div>}
                        </div>
                    </div>
                </aside>
            </div>


        </div>
    );
}

const WRAP_THEMES = [
    { id: 'midnight', accent: '#ffffff', bg: '#000000' },
    { id: 'vitality', accent: '#000000', bg: '#cdf49e' },
    { id: 'cosmic', accent: '#ff8a00', bg: '#764ba2' },
    { id: 'sunset', accent: '#ffffff', bg: '#ff4b2b' }
];
