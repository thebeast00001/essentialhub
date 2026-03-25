import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { UserProfile, DbProfile, ActivityMetadata, UserProfileDetail } from '@/types';

// ─── State Interface ──────────────────────────────────────────────────────────

interface ProfileUpsertPayload {
    email: string;
    username: string;
    full_name: string;
    avatar_url: string;
}

interface UserState {
    userId?: string;
    isSyncing: boolean;

    setUserId: (userId: string, onInitialized?: () => void) => void;
    syncProfile: (profile: ProfileUpsertPayload) => Promise<void>;
    updatePresence: () => Promise<void>;
    logActivity: (action_type: string, description: string, metadata?: ActivityMetadata) => Promise<void>;
    fetchUserProfile: (userId: string) => Promise<UserProfileDetail | null>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserState>()((set, get) => ({
    userId: undefined,
    isSyncing: false,

    setUserId: (userId: string, onInitialized?: () => void) => {
        set({ userId });
        onInitialized?.();
    },

    syncProfile: async (profile: ProfileUpsertPayload) => {
        const { userId, isSyncing } = get();
        if (!userId || isSyncing) return;

        set({ isSyncing: true });
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: userId,
                email: profile.email,
                username: profile.username,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                updated_at: new Date().toISOString(),
            }, { 
                onConflict: 'id',
                ignoreDuplicates: false 
            });

            if (error) {
                console.error('Sync Profile Error:', error.message);
                // If it's a timeout, it might be a temporary DB load issue
            }
        } catch (err) {
            console.error('Fatal Sync Profile Error:', err);
        } finally {
            set({ isSyncing: false });
        }
    },

    updatePresence: async () => {
        const { userId } = get();
        if (!userId) return;

        const { error } = await supabase
            .from('profiles')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) console.error('Update Presence Error:', error.message);
    },

    logActivity: async (action_type, description, metadata: ActivityMetadata = {}) => {
        const { userId } = get();
        if (!userId) return;

        const { error } = await supabase.from('activity_log').insert({
            user_id: userId,
            action_type,
            description,
            metadata,
            timestamp: new Date().toISOString(),
        });

        if (error) console.error('Log Activity Error:', error.message);
    },

    fetchUserProfile: async (targetUserId: string): Promise<UserProfileDetail | null> => {
        const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();

        if (profileErr || !profileData) return null;

        const profile = profileData as DbProfile;

        const [followersRes, followingRes, postsRes] = await Promise.all([
            supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', targetUserId),
            supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', targetUserId),
            supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', targetUserId),
        ]);

        return {
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            productivity_score: profile.productivity_score ?? 0,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            followersCount: followersRes.count ?? 0,
            followingCount: followingRes.count ?? 0,
            postsCount: postsRes.count ?? 0,
        };
    },
}));
