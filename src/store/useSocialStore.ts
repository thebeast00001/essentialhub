import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type {
    Post,
    PostComment,
    PostAuthor,
    CommentAuthor,
    Story,
    StoryType,
    StoryMetadata,
    UserProfile,
    SocialStats,
    Friend,
    PendingFriendRequest,
    SuggestedUser,
    ActionResult,
    DbPost,
    DbComment,
    DbStory,
    DbProfile,
    DbPostVote,
    DbCommentVote,
    DbStoryReaction,
} from '@/types';

// ─── Store State ──────────────────────────────────────────────────────────────

interface SocialState {
    userId?: string;
    onlineIds: string[];
    posts: Post[];
    loadingPosts: boolean;
    socialStats: SocialStats;
    suggestedUsers: SuggestedUser[];
    stories: Story[];
    loadingStories: boolean;
    followers: UserProfile[];
    following: UserProfile[];
    friends: Friend[];
    pendingRequests: PendingFriendRequest[];
    presenceMetadata: Record<string, { status: string; roomId?: string }>; // Map of userId -> status info
    presenceChannel: any | null;
    loadingSocial: boolean;

    // Internal mapping helpers
    _mapPost: (p: DbPost, userId?: string) => Post;
    _mapComment: (c: DbComment, userId?: string) => PostComment;

    // Setup
    initUserId: (userId: string) => void;
    initRealtimeSubscriptions: (userId: string) => void;
    recalculatePresence: () => void;
    clearSocialStore: () => void;

    // Friends
    fetchFriends: () => Promise<void>;
    addFriendByUsername: (username: string) => Promise<ActionResult>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    sendMessage: (friendId: string, message: string) => Promise<void>;
    setPresenceMetadata: (status: 'available' | 'focusing' | 'busy', roomId?: string) => void;

    // Posts & Comments
    fetchPosts: (silent?: boolean, append?: boolean) => Promise<void>;
    createPost: (content: string, image_url?: string) => Promise<void>;
    votePost: (postId: string, voteType: number) => Promise<void>;
    addComment: (postId: string, content: string, parentId?: string) => Promise<void>;
    voteComment: (commentId: string, voteType: number) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;

    // Stories
    fetchStories: (silent?: boolean) => Promise<void>;
    createStory: (content?: string, media_url?: string, type?: string, metadata?: StoryMetadata) => Promise<void>;
    deleteStory: (storyId: string) => Promise<void>;
    addStoryReaction: (storyId: string, reaction: string) => Promise<void>;

    // Followers / Following
    fetchFollowers: (silent?: boolean) => Promise<void>;
    fetchFollowing: (silent?: boolean) => Promise<void>;
    toggleFollow: (targetId: string) => Promise<void>;

    // Per-user profile data (used by profile page)
    fetchUserPosts: (userId: string) => Promise<Post[]>;
    fetchUserComments: (userId: string) => Promise<PostComment[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extracts a single profile from a Supabase join that may be an array or object */
const extractProfile = (profiles: DbProfile | DbProfile[] | null): DbProfile | null => {
    if (!profiles) return null;
    return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
};

const isOnlineByTimestamp = (updated_at: string | undefined, windowMs = 300_000): boolean => {
    if (!updated_at) return false;
    return Date.now() - new Date(updated_at).getTime() < windowMs;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSocialStore = create<SocialState>()((set, get) => ({
    userId: undefined,
    onlineIds: [],
    posts: [],
    loadingPosts: false,
    socialStats: { posts: 0, followers: 0, following: 0 },
    suggestedUsers: [],
    stories: [],
    loadingStories: false,
    followers: [],
    following: [],
    friends: [],
    pendingRequests: [],
    presenceMetadata: {},
    presenceChannel: null,
    loadingSocial: false,

    initUserId: (userId: string) => {
        set({ userId });
    },

    clearSocialStore: () => {
        set({
            posts: [],
            stories: [],
            friends: [],
            pendingRequests: [],
            followers: [],
            following: [],
            suggestedUsers: [],
            socialStats: { posts: 0, followers: 0, following: 0 },
            onlineIds: [],
            presenceMetadata: {},
            presenceChannel: null,
        });
    },

    // ── Internal Helpers ────────────────────────────────────────────────────

    _mapPost: (p: DbPost, userId?: string): Post => {
        const profile = p.profiles;
        const { onlineIds } = get();
        const isOnline =
            onlineIds.includes(profile.id) ||
            isOnlineByTimestamp(profile.updated_at, 120_000);

        const postVotes: DbPostVote[] = p.post_votes ?? [];
        const postComments: DbComment[] = p.comments ?? [];
        
        // Use denormalized counts if available, otherwise fall back to array length
        const score = typeof p.likes_count === 'number' ? p.likes_count : postVotes.reduce((acc, v) => acc + (v.vote_type ?? 0), 0);
        const commentsCount = typeof p.comments_count === 'number' ? p.comments_count : postComments.length;

        const userVote = userId ? (postVotes.find((v) => v.user_id === userId)?.vote_type ?? 0) : 0;

        const author: PostAuthor = {
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            avatar: profile.avatar_url,
            is_online: isOnline,
            updated_at: profile.updated_at,
        };

        return {
            id: p.id,
            author,
            time: p.created_at,
            content: p.content,
            image: p.image_url,
            video: p.video_url,
            likes: score,
            userVote,
            commentsCount,
            shares: 0,
            liked: userVote === 1,
            comments: postComments.map((c) => get()._mapComment(c, userId)),
            likes_count: p.likes_count,
            comments_count: p.comments_count,
        };
    },

    _mapComment: (c: DbComment, userId?: string): PostComment => {
        const commentVotes: DbCommentVote[] = c.comment_votes ?? [];
        const score = commentVotes.reduce((acc, v) => acc + (v.vote_type ?? 0), 0);
        const userVoteVal = userId ? (commentVotes.find((v) => v.user_id === userId)?.vote_type ?? 0) : 0;

        const cProfile = extractProfile(c.profiles as DbProfile | DbProfile[]);
        const { onlineIds } = get();
        const isOnline =
            onlineIds.includes(cProfile?.id ?? '') ||
            isOnlineByTimestamp(cProfile?.updated_at, 120_000);

        const author: CommentAuthor = {
            id: cProfile?.id ?? 'unknown',
            username: cProfile?.username ?? 'anonymous',
            avatar: cProfile?.avatar_url ?? '',
            is_online: isOnline,
            updated_at: cProfile?.updated_at,
        };

        return {
            id: c.id,
            postId: c.post_id,
            parentId: c.parent_id,
            author,
            content: c.content,
            likes: score,
            userVote: userVoteVal,
            liked: userVoteVal === 1,
            time: c.created_at,
        };
    },

    // ── Presence ────────────────────────────────────────────────────────────

    recalculatePresence: () => {
        const { posts, friends, followers, following, suggestedUsers, onlineIds } = get();
        const now = Date.now();
        const timeout = 120_000;

        const checkOnline = (u: { id: string; updated_at?: string }): boolean => {
            if (onlineIds.includes(u.id)) return true;
            if (!u.updated_at) return false;
            return now - new Date(u.updated_at).getTime() < timeout;
        };

        const updateUser = <T extends { id: string; updated_at?: string }>(u: T): T => {
            const metadata = get().presenceMetadata[u.id];
            const is_online = !!metadata || checkOnline(u);
            
            return {
                ...u,
                is_online,
                status: metadata?.status || (is_online ? 'available' : undefined),
                currentRoomId: metadata?.roomId,
            };
        };

        set({
            friends: friends.map(updateUser),
            followers: followers.map(updateUser),
            following: following.map(updateUser),
            suggestedUsers: suggestedUsers.map(updateUser),
            posts: posts.map((p) => ({
                ...p,
                author: { ...p.author, is_online: checkOnline(p.author) },
                comments: p.comments.map((c) => ({
                    ...c,
                    author: { ...c.author, is_online: checkOnline({ id: c.author.id, updated_at: c.author.updated_at }) },
                })),
            })),
        });
    },

    // ── Realtime Subscriptions ───────────────────────────────────────────────

    initRealtimeSubscriptions: (userId: string) => {
        set({ userId });

        const POST_SELECT =
            '*, profiles!user_id(id, username, full_name, avatar_url, updated_at), post_votes(user_id, vote_type), comments(*, profiles!user_id(id, username, avatar_url, updated_at), comment_votes(user_id, vote_type))';

        const fetchPost = async (id: string): Promise<DbPost | null> => {
            const { data } = await supabase.from('posts').select(POST_SELECT).eq('id', id).single();
            return (data as DbPost | null);
        };

        const ch = supabase
            .channel('social-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async (payload) => {
                const { userId: uid } = get();
                if (payload.eventType === 'INSERT') {
                    const newPost = await fetchPost(payload.new.id as string);
                    if (newPost) {
                        const mapped = get()._mapPost(newPost, uid);
                        set((state) => ({ posts: [mapped, ...state.posts].slice(0, 100) }));
                    }
                } else if (payload.eventType === 'DELETE') {
                    set((state) => ({ posts: state.posts.filter((p) => p.id !== payload.old.id) }));
                } else if (payload.eventType === 'UPDATE') {
                    const updated = await fetchPost(payload.new.id as string);
                    if (updated) {
                        const mapped = get()._mapPost(updated, uid);
                        set((state) => ({ posts: state.posts.map((p) => (p.id === mapped.id ? mapped : p)) }));
                    }
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async (payload) => {
                const { userId: uid } = get();
                const postId = (payload.new as { post_id?: string })?.post_id ?? (payload.old as { post_id?: string })?.post_id;
                if (!postId) return;
                const updated = await fetchPost(postId);
                if (updated) {
                    const mapped = get()._mapPost(updated, uid);
                    set((state) => ({ posts: state.posts.map((p) => (p.id === mapped.id ? mapped : p)) }));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_votes' }, async (payload) => {
                const { posts, userId: uid } = get();
                const commentId = (payload.new as { comment_id?: string })?.comment_id ?? (payload.old as { comment_id?: string })?.comment_id;
                if (!commentId) { get().fetchPosts(true); return; }

                const post = posts.find((p) => p.comments?.some((c) => c.id === commentId));
                if (!post) { get().fetchPosts(true); return; }

                const { data } = await supabase
                    .from('comment_votes')
                    .select('user_id, vote_type')
                    .eq('comment_id', commentId);

                if (data) {
                    const votes = data as DbCommentVote[];
                    const newScore = votes.reduce((acc, v) => acc + (v.vote_type ?? 0), 0);
                    const myVote = votes.find((v) => v.user_id === uid)?.vote_type ?? 0;
                    set((state) => ({
                        posts: state.posts.map((p) =>
                            p.id === post.id
                                ? {
                                      ...p,
                                      comments: p.comments.map((c) =>
                                          c.id === commentId
                                              ? { ...c, likes: newScore, userVote: myVote, liked: myVote === 1 }
                                              : c
                                      ),
                                  }
                                : p
                        ),
                    }));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'post_votes' }, async (payload) => {
                const postId = (payload.new as { post_id?: string })?.post_id ?? (payload.old as { post_id?: string })?.post_id;
                if (!postId) return;
                const { data } = await supabase.from('post_votes').select('vote_type').eq('post_id', postId);
                if (data) {
                    const votes = data as DbPostVote[];
                    const newScore = votes.reduce((acc, v) => acc + (v.vote_type ?? 0), 0);
                    set((state) => ({
                        posts: state.posts.map((p) => (p.id === postId ? { ...p, likes: newScore } : p)),
                    }));
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, async (payload) => {
                const { friends, following, stories, userId: uid } = get();
                const newStoryData = payload.new as {
                    id: string; user_id: string; media_url?: string; content?: string;
                    type: StoryType; created_at: string; metadata?: StoryMetadata;
                };

                const allKnownUsers = [...friends, ...following];
                const author = allKnownUsers.find((u) => u.id === newStoryData.user_id);

                if (!author && newStoryData.user_id === uid) {
                    get().fetchStories(true);
                    return;
                }
                if (author) {
                    const newStory: Story = {
                        id: newStoryData.id,
                        userId: newStoryData.user_id,
                        mediaUrl: newStoryData.media_url,
                        content: newStoryData.content,
                        type: newStoryData.type,
                        createdAt: newStoryData.created_at,
                        author: { username: author.username, avatar: author.avatar_url },
                        reactions: {},
                        userReactions: [],
                        metadata: newStoryData.metadata,
                    };
                    if (!stories.some((s) => s.id === newStory.id)) {
                        set({ stories: [newStory, ...stories] });
                    }
                } else {
                    get().fetchStories(true);
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, (payload) => {
                const deletedId = (payload.old as { id: string }).id;
                set((state) => ({ stories: state.stories.filter((s) => s.id !== deletedId) }));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'story_reactions' }, () =>
                get().fetchStories(true)
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => {
                get().fetchFollowers(true);
                get().fetchFollowing(true);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                const updatedProfile = payload.new as DbProfile;
                const isOnline = isOnlineByTimestamp(updatedProfile.updated_at, 300_000);

                const updateList = (list: UserProfile[]): UserProfile[] =>
                    list.map((u) =>
                        u.id === updatedProfile.id ? { ...u, ...updatedProfile, is_online: isOnline } : u
                    );

                set((state) => ({
                    friends: updateList(state.friends) as Friend[],
                    followers: updateList(state.followers),
                    following: updateList(state.following),
                    suggestedUsers: updateList(state.suggestedUsers as UserProfile[]) as SuggestedUser[],
                    posts: state.posts.map((p) =>
                        p.author?.id === updatedProfile.id
                            ? { ...p, author: { ...p.author, is_online: isOnline } }
                            : p
                    ),
                }));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await (ch as any).track({ userId, online_at: new Date().toISOString() });
                }
            });

        // Presence channel
        const presenceChannel = supabase.channel('presence-sync');
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
                const activeIds = Object.keys(newState);
                const metadata: Record<string, { status: string; roomId?: string }> = {};
                
                activeIds.forEach(id => {
                    const presence = newState[id] as any;
                    if (presence?.[0] && presence[0].user_id) {
                        const uid = presence[0].user_id;
                        metadata[uid] = {
                            status: presence[0].status || 'available',
                            roomId: presence[0].roomId
                        };
                    }
                });

                set({ onlineIds: activeIds, presenceMetadata: metadata });
                get().recalculatePresence();
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ user_id: userId, status: 'available' });
                }
            });

        set({ presenceChannel });

        // Periodic self-healing tick
        setInterval(() => get().recalculatePresence(), 30_000);
    },

    // ── Friends ─────────────────────────────────────────────────────────────

    fetchFriends: async () => {
        const { userId } = get();
        if (!userId) return;

        const { data: friendsData, error: friendsErr } = await supabase
            .from('friends')
            .select('*, profiles!friend_id(id, username, full_name, avatar_url, productivity_score, updated_at)')
            .eq('user_id', userId)
            .eq('status', 'accepted');

        const { data: requestsData, error: requestsErr } = await supabase
            .from('friends')
            .select('*, profiles!user_id(*)')
            .eq('friend_id', userId)
            .eq('status', 'pending');

        if (friendsErr) console.error('Fetch Friends Error:', friendsErr.message);
        if (requestsErr) console.error('Fetch Requests Error:', requestsErr.message);

        if (friendsData) {
            const mappedFriends: Friend[] = (friendsData as Array<{ profiles: DbProfile }>).map((f) => {
                const profile = f.profiles;
                return {
                    id: profile.id,
                    username: profile.username,
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                    productivity_score: profile.productivity_score,
                    updated_at: profile.updated_at,
                    is_online: isOnlineByTimestamp(profile.updated_at, 300_000),
                };
            });
            set({ friends: mappedFriends });
        }

        const { count: followersCount } = await supabase
            .from('friends')
            .select('*', { count: 'exact', head: true })
            .eq('friend_id', userId)
            .eq('status', 'accepted');

        const { count: postsCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        set({
            socialStats: {
                posts: postsCount ?? 0,
                followers: followersCount ?? 0,
                following: friendsData?.length ?? 0,
            },
            pendingRequests: (requestsData ?? []) as PendingFriendRequest[],
        });

        const { data: suggestions } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, productivity_score')
            .neq('id', userId)
            .limit(5);

        if (suggestions) {
            set({ suggestedUsers: suggestions as SuggestedUser[] });
        }
    },

    addFriendByUsername: async (username: string): Promise<ActionResult> => {
        const { userId } = get();
        if (!userId) return { success: false, message: 'Must be logged in' };

        const { data: targetUser, error: findErr } = await supabase
            .from('profiles')
            .select('id, username')
            .ilike('username', username)
            .maybeSingle();

        if (findErr) return { success: false, message: `Search error: ${findErr.message}` };
        if (!targetUser) return { success: false, message: 'User not found. Check the spelling or invite them!' };

        const target = targetUser as { id: string; username: string };
        if (target.id === userId) return { success: false, message: 'You cannot add yourself' };

        const { data: existing } = await supabase
            .from('friends')
            .select('id')
            .or(`and(user_id.eq.${userId},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${userId})`)
            .limit(1);

        if (existing && existing.length > 0) {
            return { success: false, message: 'Request already exists or you are already friends' };
        }

        const { error: sendErr } = await supabase
            .from('friends')
            .insert({ user_id: userId, friend_id: target.id, status: 'pending' });

        if (sendErr) return { success: false, message: `System error: ${sendErr.message}` };
        return { success: true, message: `Friend request sent to @${username}` };
    },

    acceptFriendRequest: async (requestId: string) => {
        const { userId, pendingRequests, fetchFriends, fetchFollowers, fetchFollowing } = get();
        const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId);

        if (!error) {
            const req = pendingRequests.find((r) => r.id === requestId);
            if (req && userId) {
                const requesterId = req.user_id;

                await supabase.from('friends').upsert(
                    { user_id: userId, friend_id: requesterId, status: 'accepted' },
                    { onConflict: 'user_id,friend_id' }
                );

                await supabase.from('follows').upsert(
                    { follower_id: requesterId, following_id: userId },
                    { onConflict: 'follower_id,following_id' }
                );
            }
            fetchFriends();
            fetchFollowers();
            fetchFollowing();
        }
    },

    sendMessage: async (friendId: string, message: string) => {
        const { userId } = get();
        if (!userId) return;
        const { error } = await supabase.from('messages').insert({
            sender_id: userId,
            receiver_id: friendId,
            content: message,
            created_at: new Date().toISOString(),
        });
        if (error) console.error('Send Message Error:', error.message);
    },

    setPresenceMetadata: (status, roomId) => {
        const { userId, presenceChannel } = get();
        if (!userId) return;
        
        if (presenceChannel && presenceChannel.state === 'joined') {
            presenceChannel.track({ user_id: userId, status, roomId });
        } else if (presenceChannel) {
            // If channel exists but not joined, it will track on subscribe success in init
            console.warn('[Presence] Channel not joined yet, skipping track for status:', status);
        } else {
            // Fallback: create and subscribe if missing
            const ch = supabase.channel('presence-sync');
            ch.subscribe(async (s) => {
                if (s === 'SUBSCRIBED') {
                    await ch.track({ user_id: userId, status, roomId });
                }
            });
            set({ presenceChannel: ch });
        }
    },

    // ── Posts ────────────────────────────────────────────────────────────────

    fetchPosts: async (silent = false, append = false) => {
        const { userId, posts: currentPosts } = get();
        if (!userId) return;

        if (!silent && !append) set({ loadingPosts: true });

        const POST_SELECT =
            '*, profiles:user_id(id, username, full_name, avatar_url, updated_at), post_votes(*), comments(*, profiles:user_id(id, username, avatar_url, updated_at), comment_votes(*)), likes_count, comments_count';

        let query = supabase
            .from('posts')
            .select(POST_SELECT)
            .order('created_at', { ascending: false })
            .limit(15); // Smaller batch size for smoother growth

        if (append && currentPosts.length > 0) {
            const lastPost = currentPosts[currentPosts.length - 1];
            query = query.lt('created_at', lastPost.time); // cursor: older than the last loaded post
        }

        const { data, error } = await query;

        if (data) {
            const mappedNewPosts = (data as DbPost[]).map((p) => get()._mapPost(p, userId));
            if (append) {
                set({ posts: [...currentPosts, ...mappedNewPosts], loadingPosts: false });
            } else {
                set({ posts: mappedNewPosts, loadingPosts: false });
            }
        } else {
            if (error) console.error('Fetch Posts Error:', error.message);
            set({ loadingPosts: false });
        }
    },

    createPost: async (content: string, image_url?: string) => {
        const { userId, posts, socialStats } = get();
        if (!userId) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, updated_at')
            .eq('id', userId)
            .single();

        if (!profile) { console.error('Profile not found for posting'); return; }

        const dbProfile = profile as DbProfile;

        const { data: newPost, error } = await supabase
            .from('posts')
            .insert({ user_id: userId, content, image_url: image_url ?? null })
            .select('*, profiles!user_id(id, username, full_name, avatar_url, updated_at), post_likes(user_id), comments(*, profiles!user_id(id, username, avatar_url))')
            .single();

        if (error) { console.error('Create Post Error:', error.message); return; }

        if (newPost) {
            const postData = newPost as DbPost & { profiles: DbProfile };
            const isOnline = isOnlineByTimestamp(postData.profiles.updated_at, 300_000);

            const mappedNewPost: Post = {
                id: postData.id,
                author: {
                    id: postData.profiles.id,
                    username: postData.profiles.username,
                    full_name: postData.profiles.full_name,
                    avatar: postData.profiles.avatar_url,
                    is_online: isOnline,
                    updated_at: postData.profiles.updated_at,
                },
                time: 'Just now',
                content: postData.content,
                image: postData.image_url,
                video: postData.video_url,
                likes: 0,
                commentsCount: 0,
                shares: 0,
                liked: false,
                comments: [],
            };
            set({ posts: [mappedNewPost, ...posts], socialStats: { ...socialStats, posts: (socialStats.posts ?? 0) + 1 } });
        }
    },

    votePost: async (postId, voteType) => {
        const { userId, posts } = get();
        if (!userId) return;

        const oldPosts = [...posts];
        const targetPost = posts.find((p) => p.id === postId);
        if (!targetPost) return;

        const currentVote = targetPost.userVote ?? 0;
        const newVote = currentVote === voteType ? 0 : voteType;
        const weightDiff = newVote - currentVote;

        const updatedPosts = posts.map((p) =>
            p.id === postId
                ? {
                      ...p,
                      likes: (p.likes ?? 0) + weightDiff,
                      likes_count: (p.likes_count ?? 0) + weightDiff,
                      userVote: newVote,
                  }
                : p
        );
        set({ posts: updatedPosts });

        try {
            const finalVote = updatedPosts.find((p) => p.id === postId)?.userVote ?? 0;
            if (finalVote === 0) {
                await supabase.from('post_votes').delete().eq('post_id', postId).eq('user_id', userId);
            } else {
                await supabase
                    .from('post_votes')
                    .upsert({ post_id: postId, user_id: userId, vote_type: finalVote }, { onConflict: 'post_id,user_id' });
            }
        } catch (err) {
            console.error('Vote Post Error:', err);
            set({ posts: oldPosts });
        }
    },

    addComment: async (postId: string, content: string, parentId?: string) => {
        const { userId, posts } = get();
        if (!userId || !content.trim()) return;

        const { data: newComment, error } = await supabase
            .from('comments')
            .insert({ post_id: postId, user_id: userId, content, parent_id: parentId ?? null })
            .select('*, profiles!user_id(id, username, avatar_url)')
            .single();

        if (error) { console.error('Add Comment Error:', error.message); return; }

        if (newComment) {
            const c = newComment as DbComment & { profiles: DbProfile | DbProfile[] };
            const cProf = extractProfile(c.profiles);
            const mappedComment: PostComment = {
                id: c.id,
                postId: c.post_id,
                parentId: c.parent_id,
                author: {
                    id: cProf?.id ?? 'unknown',
                    username: cProf?.username ?? 'anonymous',
                    avatar: cProf?.avatar_url ?? '',
                },
                content: c.content,
                likes: 0,
                userVote: 0,
                liked: false,
                time: 'Just now',
            };

            set({
                posts: posts.map((p) =>
                    p.id === postId
                        ? {
                              ...p,
                              comments: [mappedComment, ...(p.comments ?? [])],
                              commentsCount: (p.commentsCount ?? 0) + 1,
                              comments_count: (p.comments_count ?? 0) + 1,
                          }
                        : p
                ),
            });
        }
    },

    voteComment: async (commentId, voteType) => {
        const { userId, posts } = get();
        if (!userId) return;

        const oldPosts = [...posts];
        let foundComment = false;

        const updatedPosts = posts.map((post) => {
            const comments = post.comments ?? [];
            if (!comments.some((c) => c.id === commentId)) return post;

            const newComments = comments.map((c) => {
                if (c.id === commentId) {
                    foundComment = true;
                    const currentVote = c.userVote ?? 0;
                    const newVote = currentVote === voteType ? 0 : voteType;
                    const weightDiff = newVote - currentVote;
                    return { ...c, likes: (c.likes ?? 0) + weightDiff, userVote: newVote, liked: newVote === 1 };
                }
                return c;
            });
            return { ...post, comments: newComments };
        });

        if (!foundComment) return;
        set({ posts: updatedPosts });

        try {
            let finalVote = 0;
            outer: for (const p of updatedPosts) {
                for (const c of p.comments ?? []) {
                    if (c.id === commentId) { finalVote = c.userVote ?? 0; break outer; }
                }
            }

            if (finalVote === 0) {
                await supabase.from('comment_votes').delete().eq('comment_id', commentId).eq('user_id', userId);
            } else {
                await supabase
                    .from('comment_votes')
                    .upsert({ comment_id: commentId, user_id: userId, vote_type: finalVote }, { onConflict: 'comment_id,user_id' });
            }
        } catch (err) {
            console.error('Vote Comment Error:', err);
            set({ posts: oldPosts });
        }
    },

    deletePost: async (postId: string) => {
        const { userId, posts, socialStats } = get();
        if (!userId) return;

        const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', userId);
        if (error) { console.error('Delete Post Error:', error.message); return; }

        set({
            posts: posts.filter((p) => p.id !== postId),
            socialStats: { ...socialStats, posts: Math.max(0, (socialStats.posts ?? 0) - 1) },
        });
    },

    // ── Stories ──────────────────────────────────────────────────────────────

    fetchStories: async (silent = false) => {
        const { userId } = get();
        if (!userId) return;

        if (!silent) set({ loadingStories: true });

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('stories')
            .select('*, profiles!user_id(username, avatar_url), story_reactions(user_id, reaction)')
            .gt('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: false });

        if (data) {
            const mappedStories: Story[] = (data as DbStory[]).map((s) => {
                const reactionsMap: Record<string, number> = {};
                const userReactions: string[] = [];

                (s.story_reactions as DbStoryReaction[]).forEach((r) => {
                    reactionsMap[r.reaction] = (reactionsMap[r.reaction] ?? 0) + 1;
                    if (r.user_id === userId) userReactions.push(r.reaction);
                });

                const profile = extractProfile(s.profiles as DbProfile | DbProfile[]);

                return {
                    id: s.id,
                    userId: s.user_id,
                    mediaUrl: s.media_url,
                    content: s.content,
                    type: s.type,
                    createdAt: s.created_at,
                    author: { username: profile?.username ?? 'anonymous', avatar: profile?.avatar_url ?? '' },
                    reactions: reactionsMap,
                    userReactions,
                    metadata: s.metadata,
                };
            });
            set({ stories: mappedStories, loadingStories: false });
        } else {
            if (error) console.error('Fetch Stories Error:', error.message);
            set({ loadingStories: false });
        }
    },

    createStory: async (content, media_url, type = 'image', metadata = {}) => {
        const { userId, fetchStories } = get();
        if (!userId) return;

        const { error } = await supabase
            .from('stories')
            .insert({ user_id: userId, content, media_url, type, metadata });

        if (!error) { fetchStories(); }
        else console.error('Create Story Error:', error.message);
    },

    deleteStory: async (storyId) => {
        const { userId, fetchStories } = get();
        if (!userId) return;

        const { error } = await supabase.from('stories').delete().eq('id', storyId).eq('user_id', userId);
        if (!error) { fetchStories(); }
        else console.error('Delete Story Error:', error.message);
    },

    addStoryReaction: async (storyId, reaction) => {
        const { userId, fetchStories } = get();
        if (!userId) return;

        const { data: existing } = await supabase
            .from('story_reactions')
            .select('*')
            .eq('story_id', storyId)
            .eq('user_id', userId)
            .eq('reaction', reaction)
            .maybeSingle();

        if (existing) {
            await supabase.from('story_reactions').delete().eq('id', (existing as DbStoryReaction).id);
        } else {
            await supabase.from('story_reactions').insert({ story_id: storyId, user_id: userId, reaction });
        }

        fetchStories();
    },

    // ── Followers / Following ────────────────────────────────────────────────

    fetchFollowers: async (silent = false) => {
        const { userId } = get();
        if (!userId) return;
        if (!silent) set({ loadingSocial: true });

        const { data } = await supabase
            .from('follows')
            .select('profiles!follower_id(*)')
            .eq('following_id', userId);

        if (data) {
            const mapped: UserProfile[] = (data as Array<{ profiles: DbProfile | DbProfile[] }>).map((f) => {
                const prof = extractProfile(f.profiles);
                return {
                    id: prof?.id ?? '',
                    username: prof?.username ?? '',
                    full_name: prof?.full_name ?? '',
                    avatar_url: prof?.avatar_url ?? '',
                    updated_at: prof?.updated_at,
                    is_online: isOnlineByTimestamp(prof?.updated_at, 300_000),
                };
            });
            set({ followers: mapped, loadingSocial: false });
        } else {
            set({ loadingSocial: false });
        }
    },

    fetchFollowing: async (silent = false) => {
        const { userId } = get();
        if (!userId) return;
        if (!silent) set({ loadingSocial: true });

        const { data } = await supabase
            .from('follows')
            .select('profiles!following_id(*)')
            .eq('follower_id', userId);

        if (data) {
            const mapped: UserProfile[] = (data as Array<{ profiles: DbProfile | DbProfile[] }>).map((f) => {
                const prof = extractProfile(f.profiles);
                return {
                    id: prof?.id ?? '',
                    username: prof?.username ?? '',
                    full_name: prof?.full_name ?? '',
                    avatar_url: prof?.avatar_url ?? '',
                    updated_at: prof?.updated_at,
                    is_online: isOnlineByTimestamp(prof?.updated_at, 300_000),
                };
            });
            set({ following: mapped, loadingSocial: false });
        } else {
            set({ loadingSocial: false });
        }
    },

    toggleFollow: async (targetId) => {
        const { userId, fetchFollowing } = get();
        if (!userId || userId === targetId) return;

        const { data: existing } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', userId)
            .eq('following_id', targetId)
            .maybeSingle();

        if (existing) {
            await supabase.from('follows').delete().eq('id', (existing as { id: string }).id);
        } else {
            await supabase.from('follows').insert({ follower_id: userId, following_id: targetId });
        }
        fetchFollowing();
    },

    // ── Per-user Profile Queries ─────────────────────────────────────────────

    fetchUserPosts: async (targetUserId: string): Promise<Post[]> => {
        const { userId } = get();
        const POST_SELECT =
            '*, profiles!user_id(id, username, full_name, avatar_url, updated_at), post_votes(user_id, vote_type), comments(*, profiles!user_id(id, username, avatar_url), comment_votes(user_id, vote_type)), likes_count, comments_count';

        const { data, error } = await supabase
            .from('posts')
            .select(POST_SELECT)
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false });

        if (error) { console.error('Fetch User Posts Error:', error.message); return []; }
        return (data as DbPost[]).map((post) => get()._mapPost(post, userId));
    },

    fetchUserComments: async (targetUserId: string): Promise<PostComment[]> => {
        const { userId } = get();
        const { data, error } = await supabase
            .from('comments')
            .select('*, profiles!user_id(id, username, avatar_url), comment_votes(user_id, vote_type)')
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false });

        if (error) { console.error('Fetch User Comments Error:', error.message); return []; }
        return (data as DbComment[]).map((c) => get()._mapComment(c, userId));
    },
}));
