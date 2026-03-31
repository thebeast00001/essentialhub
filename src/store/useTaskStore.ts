/**
 * useTaskStore — Core productivity store.
 *
 * Handles: Tasks, Habits, Focus Sessions, Activities, Timer, and Productivity Score.
 *
 * Social & User concerns have been moved to:
 *   - useSocialStore  → posts, stories, friends, presence
 *   - useUserStore    → profile sync, presence heartbeat
 *
 * ─── BACKWARDS COMPATIBILITY ────────────────────────────────────────────────
 * All types and the `useTaskStore` hook are re-exported from this file so that
 * existing component imports continue to work without any changes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { generateSchedule } from '../utils/autoPilot';
import type {
    Task,
    Habit,
    FocusSession,
    Activity,
    ActivityType,
    ActivityMetadata,
    Priority,
    DbTask,
    DbHabit,
    DbFocusSession,
    DbActivityLog,
    ActionResult,
    SocialStats,
    Friend,
    PendingFriendRequest,
    SuggestedUser,
    Post,
    PostComment,
    Story,
    UserProfile,
    UserProfileDetail,
} from '@/types';

// Re-export all types from the central registry so existing imports still work
export type {
    Task,
    Habit,
    FocusSession,
    Activity,
    ActivityType,
    ActivityMetadata,
    Priority,
    SubTask,
    RecurringInterval,
    UserProfile,
    UserProfileDetail,
    PostComment,
    Post,
    Story,
    StoryType,
    StoryMetadata,
    SocialStats,
    Friend,
    PendingFriendRequest,
    SuggestedUser,
    ActionResult,
    TimerState,
    // DB row types (useful for API routes / tests)
    DbTask,
    DbHabit,
    DbFocusSession,
    DbActivityLog,
    DbProfile,
    DbPost,
    DbComment,
    DbStory,
} from '@/types';

// Import stores for local sync
import { useSocialStore } from './useSocialStore';
import { useUserStore } from './useUserStore';

// Re-export stores so other files can still import them from here
export { useSocialStore, useUserStore };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getLocalDateStr = (input?: Date | string | number): string => {
    return format(input ? new Date(input) : new Date(), 'yyyy-MM-dd');
};

const calculateStreak = (completedDates: string[] = []): number => {
    if (!completedDates || completedDates.length === 0) return 0;

    const datesSet = new Set(completedDates);
    let streak = 0;

    const now = new Date();
    now.setHours(12, 0, 0, 0);

    const todayStr = getLocalDateStr(now);

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterdayDate);

    let checkDay = new Date(now);

    if (!datesSet.has(todayStr)) {
        if (!datesSet.has(yesterdayStr)) return 0;
        checkDay = yesterdayDate;
    } else {
        checkDay = now;
    }

    while (datesSet.has(getLocalDateStr(checkDay))) {
        streak++;
        checkDay.setDate(checkDay.getDate() - 1);
        if (streak > 5000) break; // Safety limit
    }

    return streak;
};

const normalizeDate = (d?: string): string | null => {
    if (!d) return null;
    if (d.includes('Z') || d.includes('+')) return d;
    try {
        return new Date(d).toISOString();
    } catch {
        return null;
    }
};

// ─── State Interface ──────────────────────────────────────────────────────────

interface TaskState {
    tasks: Task[];
    habits: Habit[];
    activities: Activity[];
    focusSessions: FocusSession[];
    productivityScore: number;
    focusTimeToday: number;      // minutes
    isTimerRunning: boolean;
    timerSeconds: number;
    initialTimerSeconds: number;
    activeTaskId?: string;
    timerStartedAt?: number;
    guardianModeEnabled: boolean;
    userId?: string;
    isSyncing: boolean;

    // ── Social shim state ──────────────────────────────────────────────────
    // Kept so components that destructure from useTaskStore() continue to compile.
    // The actual data lives in useSocialStore.
    friends: Friend[];
    pendingRequests: PendingFriendRequest[];
    lastPresenceUpdate: number;
    onlineIds: string[];
    socialStats: SocialStats;
    suggestedUsers: SuggestedUser[];
    loadingPosts: boolean;
    loadingStories: boolean;
    loadingSocial: boolean;
    posts: Post[];
    stories: Story[];
    followers: UserProfile[];
    following: UserProfile[];

    // ── Lifecycle ──────────────────────────────────────────────────────────
    setUserId: (userId: string) => void;
    initializeSupabase: () => void;
    fetchData: () => Promise<void>;
    clearStore: () => void;

    // ── Profile / Presence (delegated helpers) ────────────────────────────
    syncProfile: (profile: { email: string; username: string; full_name: string; avatar_url: string }) => Promise<void>;
    updatePresence: () => Promise<void>;
    logActivity: (action_type: string, description: string, metadata?: ActivityMetadata) => Promise<void>;

    // ── Tasks ──────────────────────────────────────────────────────────────
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'order'>) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    reorderTasks: (newTasks: Task[]) => void;
    generateAutoPilotSchedule: () => Promise<void>;

    // ── Habits ─────────────────────────────────────────────────────────────
    addHabit: (title: string) => void;
    toggleHabit: (id: string, customDate?: string) => void;
    deleteHabit: (id: string) => void;

    // ── Timer & Focus ──────────────────────────────────────────────────────
    startTimer: (taskId?: string, guardianMode?: boolean) => void;
    stopTimer: (brokenGuardian?: boolean) => void;
    resetTimer: () => void;
    tickTimer: () => void;
    setTimerDuration: (seconds: number) => void;
    addFocusTime: (minutes: number, taskId?: string) => void;

    // ── Scoring & Analytics ────────────────────────────────────────────────
    calculateProductivityScore: () => void;
    addActivity: (type: ActivityType, title: string, metadata?: ActivityMetadata) => void;
    getSuggestedTasks: () => string[];

    // ── Social shim methods (proxy to useSocialStore) ──────────────────────
    recalculatePresence: () => void;
    fetchFriends: () => Promise<void>;
    addFriendByUsername: (username: string) => Promise<ActionResult>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    sendMessage: (friendId: string, message: string) => Promise<void>;
    setPresenceMetadata: (status: 'available' | 'focusing' | 'busy') => void;
    fetchPosts: (silent?: boolean) => Promise<void>;
    createPost: (content: string, image_url?: string) => Promise<void>;
    votePost: (postId: string, voteType: number) => Promise<void>;
    addComment: (postId: string, content: string, parentId?: string) => Promise<void>;
    voteComment: (commentId: string, voteType: number) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    fetchStories: (silent?: boolean) => Promise<void>;
    createStory: (content?: string, media_url?: string, type?: string, metadata?: StoryMetadataParam) => Promise<void>;
    deleteStory: (storyId: string) => Promise<void>;
    addStoryReaction: (storyId: string, reaction: string) => Promise<void>;
    fetchFollowers: (silent?: boolean) => Promise<void>;
    fetchFollowing: (silent?: boolean) => Promise<void>;
    toggleFollow: (targetId: string) => Promise<void>;
    fetchUserPosts: (userId: string) => Promise<Post[]>;
    fetchUserComments: (userId: string) => Promise<PostComment[]>;
    fetchUserProfile: (userId: string) => Promise<UserProfileDetail | null>;
    _mapPost: (p: any, userId?: string) => Post;
    _mapComment: (c: any, userId?: string) => PostComment;
}

// Separate type alias to avoid circular import in interface above
type StoryMetadataParam = Record<string, unknown>;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => {
            // Lazy require to avoid circular deps at module load time
            const getSocial = () => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { useSocialStore } = require('./useSocialStore');
                return useSocialStore.getState();
            };
            const getUserStore = () => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { useUserStore } = require('./useUserStore');
                return useUserStore.getState();
            };

            return {
                tasks: [],
                habits: [],
                activities: [],
                focusSessions: [],
                productivityScore: 0,
                focusTimeToday: 0,
                isTimerRunning: false,
                timerSeconds: 2700, // 45 mins default
                initialTimerSeconds: 2700,
                activeTaskId: undefined,
                guardianModeEnabled: false,
                isSyncing: false,
                lastPresenceUpdate: 0,

                // Social shim state
                friends: [],
                pendingRequests: [],
                onlineIds: [],
                posts: [],
                loadingPosts: false,
                socialStats: { posts: 0, followers: 0, following: 0 },
                suggestedUsers: [],
                stories: [],
                loadingStories: false,
                followers: [],
                following: [],
                loadingSocial: false,

                // ── Lifecycle ────────────────────────────────────────────────────

                setUserId: (userId: string) => {
                    const currentId = get().userId;
                    const isNewUser = currentId !== userId;

                    if (currentId && isNewUser) {
                        get().clearStore();
                    }

                    set({ userId });

                    get().fetchData();
                    get().initializeSupabase();

                    // Delegate social bootstrapping
                    getSocial().initUserId(userId);
                    getSocial().initRealtimeSubscriptions(userId);
                    getSocial().fetchFriends();
                    getSocial().fetchPosts();
                    getSocial().fetchStories();
                    getSocial().fetchFollowers();
                    getSocial().fetchFollowing();

                    if (isNewUser && userId) {
                        get().logActivity('app_session_start', 'User opened the application');
                    }
                },

                clearStore: () => {
                    set({
                        tasks: [],
                        habits: [],
                        activities: [],
                        focusSessions: [],
                        productivityScore: 0,
                        focusTimeToday: 0,
                        activeTaskId: undefined,
                        guardianModeEnabled: false,
                    });
                    getSocial().clearSocialStore();
                },

                // ── Profile / Presence (proxied to useUserStore) ─────────────────

                syncProfile: async (profile) => {
                    const { userId } = get();
                    if (!userId) return;
                    getUserStore().setUserId(userId);
                    await getUserStore().syncProfile(profile);
                    set({ lastPresenceUpdate: Date.now() });
                },

                updatePresence: async () => {
                    const { userId } = get();
                    if (!userId) return;
                    getUserStore().setUserId(userId);
                    await getUserStore().updatePresence();
                },

                logActivity: async (action_type, description, metadata = {}) => {
                    const { userId } = get();
                    if (!userId) return;
                    getUserStore().setUserId(userId);
                    await getUserStore().logActivity(action_type, description, metadata);
                },

                // ── Supabase Realtime (tasks/habits/sessions only) ────────────────

                initializeSupabase: () => {
                    const { userId } = get();
                    if (!userId) return;

                    supabase
                        .channel('core-realtime')
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => get().fetchData())
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => get().fetchData())
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions', filter: `user_id=eq.${userId}` }, () => get().fetchData())
                        .subscribe();
                },

                // ── Data Fetch ────────────────────────────────────────────────────

                fetchData: async () => {
                    const { userId } = get();
                    if (!userId) return;

                    set({ isSyncing: true });

                    const [tasksRes, habitsRes, sessionsRes, logEntriesRes] = await Promise.all([
                        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
                        supabase.from('habits').select('*').eq('user_id', userId),
                        supabase.from('focus_sessions').select('*').eq('user_id', userId),
                        supabase.from('activity_log').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).limit(500),
                    ]);

                    if (tasksRes.error) console.error('Sync Error (Tasks):', tasksRes.error.message);
                    if (habitsRes.error) console.error('Sync Error (Habits):', habitsRes.error.message);
                    if (sessionsRes.error) console.error('Sync Error (Sessions):', sessionsRes.error.message);
                    if (logEntriesRes.error) console.error('Sync Error (Logs):', logEntriesRes.error.message);

                    if (tasksRes.data) {
                        set({
                            tasks: (tasksRes.data as DbTask[]).map((t): Task => ({
                                id: t.id,
                                title: t.title,
                                description: t.description,
                                deadline: t.deadline,
                                priority: t.priority,
                                tags: t.tags || [],
                                subtasks: [],
                                completed: t.completed,
                                createdAt: t.created_at,
                                completedAt: t.completed_at,
                                order: t.task_order,
                                scheduled_start: t.scheduled_start ?? undefined,
                                scheduled_end: t.scheduled_end ?? undefined,
                                duration_estimate: t.duration_estimate ?? undefined,
                                is_auto_scheduled: t.is_auto_scheduled,
                            })),
                        });
                    }

                    if (habitsRes.data) {
                        const { data: habitLogs } = await supabase
                            .from('activity_log')
                            .select('*')
                            .eq('user_id', userId)
                            .eq('action_type', 'habit_completed');

                        const todayStr = getLocalDateStr();

                        const updatedHabits: Habit[] = (habitsRes.data as DbHabit[]).map((h) => {
                            const logs = (habitLogs as DbActivityLog[] | null)?.filter((l) => {
                                let meta: ActivityMetadata | null = null;
                                if (typeof l.metadata === 'string') {
                                    try { meta = JSON.parse(l.metadata); } catch { return false; }
                                } else {
                                    meta = l.metadata as ActivityMetadata;
                                }
                                return meta?.habitId === h.id;
                            }) ?? [];

                            const completedDates = Array.from(
                                new Set(
                                    logs
                                        .map((l) => {
                                            let meta: ActivityMetadata | null = null;
                                            if (typeof l.metadata === 'string') {
                                                try { meta = JSON.parse(l.metadata); } catch { return null; }
                                            } else {
                                                meta = l.metadata as ActivityMetadata;
                                            }
                                            return meta?.date ?? null;
                                        })
                                        .filter((d): d is string => d !== null)
                                )
                            );

                            if (h.completed_today && !completedDates.includes(todayStr)) {
                                completedDates.push(todayStr);
                            }

                            return {
                                id: h.id,
                                title: h.title,
                                streak: calculateStreak(completedDates),
                                completedToday: completedDates.includes(todayStr),
                                lastCompleted: h.last_completed_at,
                                completedDates,
                            };
                        });

                        set({ habits: updatedHabits });

                        // Sync streak counts back to DB
                        updatedHabits.forEach(async (h, idx) => {
                            const original = (habitsRes.data as DbHabit[])[idx];
                            if (h.streak !== original.streak) {
                                await supabase.from('habits').update({ streak: h.streak }).eq('id', h.id);
                            }
                        });
                    }

                    if (sessionsRes.data) {
                        const today = new Date().toDateString();
                        const sessionsMapped: FocusSession[] = (sessionsRes.data as DbFocusSession[]).map((s) => ({
                            id: s.id,
                            taskId: s.task_id,
                            duration: s.duration_mins,
                            timestamp: s.completed_at,
                        }));

                        const todayMinutes = sessionsMapped
                            .filter((s) => new Date(s.timestamp).toDateString() === today)
                            .reduce((acc, s) => acc + s.duration, 0);

                        set({ focusSessions: sessionsMapped, focusTimeToday: todayMinutes });
                    }

                    if (logEntriesRes.data) {
                        set({
                            activities: (logEntriesRes.data as DbActivityLog[])
                                .filter((l) => l.action_type !== 'app_session_start' && l.action_type !== 'app_used')
                                .map((l): Activity => ({
                                    id: l.id,
                                    type: l.action_type as ActivityType,
                                    title: l.description,
                                    timestamp: l.timestamp,
                                    metadata: (typeof l.metadata === 'string'
                                        ? (() => { try { return JSON.parse(l.metadata); } catch { return {}; } })()
                                        : l.metadata) as ActivityMetadata,
                                })),
                        });
                    }

                    set({ isSyncing: false });
                    get().calculateProductivityScore();
                },

                // ── Tasks ─────────────────────────────────────────────────────────

                addTask: async (taskData) => {
                    const { userId } = get();
                    const newTask: Task = {
                        ...taskData,
                        id: crypto.randomUUID(),
                        createdAt: new Date().toISOString(),
                        completed: false,
                        order: get().tasks.length,
                    };

                    set((state) => ({ tasks: [...state.tasks, newTask] }));
                    get().addActivity('task_created', newTask.title);
                    get().calculateProductivityScore();
                    get().logActivity('task_created', `Added new task: ${newTask.title}`, { taskId: newTask.id });

                    if (userId) {
                        const { error } = await supabase.from('tasks').insert({
                            id: newTask.id,
                            user_id: userId,
                            title: newTask.title,
                            description: newTask.description ?? null,
                            priority: newTask.priority,
                            tags: newTask.tags,
                            deadline: normalizeDate(newTask.deadline),
                            completed: false,
                            scheduled_start: normalizeDate(newTask.scheduled_start),
                            scheduled_end: normalizeDate(newTask.scheduled_end),
                            duration_estimate: newTask.duration_estimate ?? null,
                            is_auto_scheduled: newTask.is_auto_scheduled ?? false,
                        });
                        if (error) console.error('Database Insert Error:', error.message);
                    }
                },

                toggleTask: async (id) => {
                    const { userId, tasks } = get();
                    const task = tasks.find((t) => t.id === id);
                    if (!task) return;

                    const newCompleted = !task.completed;
                    const completedAt = newCompleted ? new Date().toISOString() : null;

                    set((state) => ({
                        tasks: state.tasks.map((t) =>
                            t.id === id ? { ...t, completed: newCompleted, completedAt: completedAt ?? undefined } : t
                        ),
                    }));

                    if (newCompleted) {
                        get().addActivity('task_completed', task.title, { taskId: id });
                        get().logActivity('task_completed', `Completed task: ${task.title}`, { taskId: id });
                    } else {
                        set((state) => ({
                            activities: state.activities.filter(
                                (a) => !(a.type === 'task_completed' && a.metadata?.taskId === id)
                            ),
                        }));
                        get().logActivity('task_reopened', `Reopened task: ${task.title}`, { taskId: id });

                        if (userId) {
                            await supabase
                                .from('activity_log')
                                .delete()
                                .match({ user_id: userId, action_type: 'task_completed' })
                                .filter('metadata->>taskId', 'eq', id);
                        }
                    }

                    get().calculateProductivityScore();

                    if (userId) {
                        await supabase
                            .from('tasks')
                            .update({ completed: newCompleted, completed_at: completedAt })
                            .eq('id', id);
                    }
                },

                deleteTask: async (id) => {
                    const { userId, tasks, focusSessions, activities } = get();
                    const task = tasks.find((t) => t.id === id);
                    if (task) get().logActivity('task_deleted', `Deleted task: ${task.title}`, { taskId: id });

                    const remainingTasks = tasks.filter((t) => t.id !== id);
                    const remainingSessions = focusSessions.filter((s) => s.taskId !== id);
                    const remainingActivities = activities.filter((a) => a.metadata?.taskId !== id);

                    const today = new Date().toDateString();
                    const newFocusTimeToday = remainingSessions
                        .filter((s) => new Date(s.timestamp).toDateString() === today)
                        .reduce((acc, s) => acc + s.duration, 0);

                    set({
                        tasks: remainingTasks,
                        focusSessions: remainingSessions,
                        activities: remainingActivities,
                        focusTimeToday: newFocusTimeToday,
                    });
                    get().calculateProductivityScore();

                    if (userId) {
                        await Promise.all([
                            supabase.from('tasks').delete().eq('id', id),
                            supabase.from('focus_sessions').delete().eq('task_id', id),
                            supabase.from('activity_log').delete().match({ user_id: userId }).filter('metadata->>taskId', 'eq', id),
                        ]);
                    }
                },

                updateTask: async (id, updates) => {
                    const { userId, tasks } = get();
                    const task = tasks.find((t) => t.id === id);
                    set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));
                    get().logActivity('task_updated', `Updated task: ${task?.title}`, { taskId: id });

                    if (userId) {
                        const dbUpdates: Partial<DbTask> = {};
                        if (updates.title !== undefined) dbUpdates.title = updates.title;
                        if (updates.description !== undefined) dbUpdates.description = updates.description;
                        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
                        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
                        if (updates.deadline !== undefined) (dbUpdates as Record<string, string | null>).deadline = normalizeDate(updates.deadline);
                        if (updates.scheduled_start !== undefined) (dbUpdates as Record<string, string | null>).scheduled_start = normalizeDate(updates.scheduled_start);
                        if (updates.scheduled_end !== undefined) (dbUpdates as Record<string, string | null>).scheduled_end = normalizeDate(updates.scheduled_end);

                        if (Object.keys(dbUpdates).length > 0) {
                            await supabase.from('tasks').update(dbUpdates).eq('id', id);
                        }
                    }
                },

                reorderTasks: (newTasks) => {
                    set({ tasks: newTasks });
                    get().logActivity('tasks_reordered', 'Reordered task pipeline');
                },

                generateAutoPilotSchedule: async () => {
                    const { tasks, focusSessions, userId } = get();
                    const uncompletedTasks = tasks.filter((t) => !t.completed);
                    if (uncompletedTasks.length === 0) return;

                    const scheduledTasks = generateSchedule(uncompletedTasks, focusSessions);

                    set((state) => ({
                        tasks: state.tasks.map((t) => {
                            const scheduled = scheduledTasks.find((s) => s.id === t.id);
                            if (scheduled) {
                                const newOrder = 1000 + (scheduledTasks.length - scheduledTasks.indexOf(scheduled));
                                return { ...scheduled, order: newOrder };
                            }
                            return t;
                        }),
                    }));

                    get().logActivity('autopilot_generated', `AI Auto-Pilot optimized ${scheduledTasks.length} missions for your peak energy hours.`);

                    if (userId && scheduledTasks.length > 0) {
                        const updates = scheduledTasks.map((t) => {
                            const idx = scheduledTasks.indexOf(t);
                            return {
                                id: t.id,
                                user_id: userId,
                                title: t.title,
                                description: t.description ?? null,
                                deadline: t.deadline ?? null,
                                priority: t.priority,
                                tags: t.tags ?? [],
                                completed: t.completed,
                                created_at: t.createdAt,
                                task_order: 1000 + (scheduledTasks.length - idx),
                                duration_estimate: t.duration_estimate ?? null,
                                scheduled_start: t.scheduled_start ?? null,
                                scheduled_end: t.scheduled_end ?? null,
                                is_auto_scheduled: true,
                            };
                        });

                        const { error } = await supabase.from('tasks').upsert(updates);
                        if (error) console.error('AutoPilot Sync Error:', error.message);
                    }
                },

                // ── Habits ────────────────────────────────────────────────────────

                addHabit: async (title) => {
                    const { userId } = get();
                    const newHabit: Habit = {
                        id: crypto.randomUUID(),
                        title,
                        streak: 0,
                        completedToday: false,
                        completedDates: [],
                    };
                    set((state) => ({ habits: [...state.habits, newHabit] }));
                    get().logActivity('habit_created', `Created new habit: ${title}`, { habitId: newHabit.id });

                    if (userId) {
                        const { error } = await supabase.from('habits').insert({
                            id: newHabit.id,
                            user_id: userId,
                            title: newHabit.title,
                            streak: 0,
                            completed_today: false,
                        });
                        if (error) console.error('Add Habit Error:', error.message);
                        get().fetchData();
                    }
                },

                toggleHabit: async (id, customDate?: string) => {
                    const { userId, habits } = get();
                    const habit = habits.find((h) => h.id === id);
                    if (!habit) return;

                    const targetDate = customDate ?? getLocalDateStr();
                    const todayStr = getLocalDateStr();

                    if (targetDate > todayStr) {
                        console.warn('[Habits] Blocked attempt to mark future date:', targetDate);
                        return;
                    }

                    const isToday = targetDate === todayStr;
                    const dates = new Set(habit.completedDates ?? []);
                    const becomingCompleted = !dates.has(targetDate);

                    becomingCompleted ? dates.add(targetDate) : dates.delete(targetDate);

                    const completedDates = Array.from(dates);
                    const streak = calculateStreak(completedDates);

                    set((state) => ({
                        habits: state.habits.map((h) =>
                            h.id === id
                                ? { ...h, completedToday: isToday ? becomingCompleted : h.completedToday, streak, completedDates }
                                : h
                        ),
                    }));

                    if (becomingCompleted) {
                        get().addActivity('habit_completed', habit.title, { habitId: id, date: targetDate });
                        get().logActivity('habit_completed', `Performed habit: ${habit.title}`, { habitId: id, streak, date: targetDate });
                    } else {
                        set((state) => ({
                            activities: state.activities.filter(
                                (a) => !(a.type === 'habit_completed' && a.metadata?.habitId === id && a.metadata?.date === targetDate)
                            ),
                        }));
                        get().logActivity('habit_uncompleted', `Undo habit: ${habit.title}`, { habitId: id, date: targetDate });

                        if (userId) {
                            await supabase
                                .from('activity_log')
                                .delete()
                                .eq('action_type', 'habit_completed')
                                .eq('user_id', userId)
                                .filter('metadata->>habitId', 'eq', id)
                                .filter('metadata->>date', 'eq', targetDate);
                        }
                    }

                    get().calculateProductivityScore();

                    if (userId && isToday) {
                        await supabase
                            .from('habits')
                            .update({
                                completed_today: becomingCompleted,
                                streak,
                                last_completed_at: becomingCompleted ? new Date().toISOString() : (habit.lastCompleted ?? null),
                            })
                            .eq('id', id);
                    }
                },

                deleteHabit: async (id) => {
                    const { userId, habits } = get();
                    const habit = habits.find((h) => h.id === id);
                    set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }));
                    get().logActivity('habit_deleted', `Deleted habit: ${habit?.title ?? 'Unknown'}`, { habitId: id });

                    if (userId) {
                        await supabase.from('habits').delete().eq('id', id);
                    }
                },

                // ── Timer ─────────────────────────────────────────────────────────

                startTimer: (taskId, guardianMode = false) => {
                    const task = get().tasks.find((t) => t.id === taskId);
                    set({
                        isTimerRunning: true,
                        activeTaskId: taskId ?? get().activeTaskId,
                        timerStartedAt: Date.now(),
                        guardianModeEnabled: guardianMode,
                    });
                    get().logActivity(
                        'timer_started',
                        `Started ${guardianMode ? 'GUARDIAN ' : ''}focus session${task ? `: ${task.title}` : ''}`,
                        { taskId, guardianMode }
                    );
                },

                stopTimer: (brokenGuardian = false) => {
                    const state = get();
                    const { isTimerRunning, timerSeconds, timerStartedAt, activeTaskId, guardianModeEnabled, productivityScore } = state;

                    if (isTimerRunning && timerStartedAt) {
                        const elapsedSinceStart = Math.floor((Date.now() - timerStartedAt) / 1000);
                        const newSeconds = Math.max(0, timerSeconds - elapsedSinceStart);
                        const elapsedMins = Math.floor(elapsedSinceStart / 60);

                        if (elapsedMins >= 1) get().addFocusTime(elapsedMins, activeTaskId);

                        set({
                            isTimerRunning: false,
                            timerSeconds: newSeconds,
                            timerStartedAt: undefined,
                            guardianModeEnabled: false,
                            productivityScore:
                                brokenGuardian && guardianModeEnabled
                                    ? Math.max(0, productivityScore - 50)
                                    : productivityScore,
                        });

                        if (brokenGuardian && guardianModeEnabled) {
                            get().logActivity('guardian_broken', 'Flow State Guardian Broken! Severe penalty applied.', { penalty: 50 });
                            get().addActivity('task_missed', 'Guardian Mode Failed');
                        } else {
                            get().logActivity('timer_paused', `Paused focus session (${elapsedMins}m logged)`);
                        }
                    } else {
                        set({ isTimerRunning: false, timerStartedAt: undefined, guardianModeEnabled: false });
                    }
                },

                resetTimer: () => {
                    set((state) => ({
                        isTimerRunning: false,
                        timerSeconds: state.initialTimerSeconds,
                        timerStartedAt: undefined,
                        guardianModeEnabled: false,
                    }));
                    get().logActivity('timer_reset', 'Reset focus timer');
                },

                tickTimer: () => {
                    const { timerSeconds, isTimerRunning, timerStartedAt, initialTimerSeconds, activeTaskId, guardianModeEnabled, productivityScore } = get();
                    if (!isTimerRunning || !timerStartedAt) return;

                    const elapsedSinceStart = Math.floor((Date.now() - timerStartedAt) / 1000);
                    const currentRemaining = timerSeconds - elapsedSinceStart;

                    if (currentRemaining <= 0) {
                        const durationMins = Math.floor(initialTimerSeconds / 60);
                        set({
                            isTimerRunning: false,
                            timerSeconds: initialTimerSeconds,
                            timerStartedAt: undefined,
                            productivityScore: guardianModeEnabled ? productivityScore + 25 : productivityScore,
                            guardianModeEnabled: false,
                        });
                        get().addFocusTime(durationMins, activeTaskId);
                        get().addActivity('task_completed', `Completed ${guardianModeEnabled ? 'Guardian ' : ''}Focus Session`);
                        if (guardianModeEnabled) {
                            get().logActivity('guardian_success', 'Flawless Guardian Session Complete! Bonus awarded.', { bonus: 25 });
                        }
                    }
                },

                addFocusTime: async (minutes, taskId) => {
                    const { userId, tasks } = get();
                    const task = tasks.find((t) => t.id === taskId);
                    const newSession: FocusSession = {
                        id: crypto.randomUUID(),
                        taskId,
                        duration: minutes,
                        timestamp: new Date().toISOString(),
                    };
                    set((state) => ({
                        focusTimeToday: state.focusTimeToday + minutes,
                        focusSessions: [...state.focusSessions, newSession],
                    }));
                    get().calculateProductivityScore();
                    get().logActivity(
                        'focus_session_complete',
                        `Completed ${minutes}m focus session${task ? `: ${task.title}` : ''}`,
                        { taskId, duration: minutes }
                    );

                    if (userId) {
                        await supabase.from('focus_sessions').insert({
                            id: newSession.id,
                            user_id: userId,
                            task_id: taskId ?? null,
                            duration_mins: minutes,
                            completed_at: newSession.timestamp,
                        });
                    }
                },

                setTimerDuration: (seconds: number) => {
                    const cappedSeconds = Math.max(10, Math.min(36000, seconds));
                    set({ initialTimerSeconds: cappedSeconds, timerSeconds: cappedSeconds, isTimerRunning: false });
                },

                // ── Scoring ───────────────────────────────────────────────────────

                addActivity: (type, title, metadata = {}) => {
                    const newActivity: Activity = {
                        id: crypto.randomUUID(),
                        type,
                        title,
                        timestamp: new Date().toISOString(),
                        metadata,
                    };
                    set((state) => ({ activities: [newActivity, ...state.activities].slice(0, 50) }));
                },

                calculateProductivityScore: () => {
                    const { tasks, habits, focusTimeToday } = get();
                    if (tasks.length === 0 && habits.length === 0) {
                        set({ productivityScore: 0 });
                        return;
                    }

                    const completedTasks = tasks.filter((t) => t.completed).length;
                    const totalTasks = tasks.length;
                    const taskRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;
                    const habitRatio =
                        habits.length > 0 ? habits.filter((h) => h.completedToday).length / habits.length : 0;
                    const focusBonus = Math.min(0.3, (focusTimeToday / 30) * 0.1);
                    const score = Math.round(Math.min(100, (taskRatio * 0.5 + habitRatio * 0.3 + focusBonus) * 100));
                    set({ productivityScore: score });

                    const { userId } = get();
                    if (userId) {
                        supabase.from('profiles').update({ productivity_score: score }).eq('id', userId);
                    }
                },

                getSuggestedTasks: () => {
                    const { activities } = get();
                    const taskTitles = activities.filter((a) => a.type === 'task_created').map((a) => a.title);
                    const counts: Record<string, number> = {};
                    taskTitles.forEach((t) => {
                        counts[t] = (counts[t] ?? 0) + 1;
                    });

                    const suggestions = Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .filter(([, count]) => count >= 2)
                        .map(([title]) => title)
                        .slice(0, 5);

                    return suggestions.length === 0
                        ? ['Check Emails', 'Daily Standup', 'Review PRs', 'Plan Tomorrow']
                        : suggestions;
                },

                // ── Social shim methods (proxy to useSocialStore) ─────────────────

                recalculatePresence: () => getSocial().recalculatePresence(),
                fetchFriends: () => getSocial().fetchFriends(),
                addFriendByUsername: (username: string) => getSocial().addFriendByUsername(username),
                acceptFriendRequest: (id: string) => getSocial().acceptFriendRequest(id),
                sendMessage: (friendId: string, message: string) => getSocial().sendMessage(friendId, message),
                setPresenceMetadata: (status) => getSocial().setPresenceMetadata(status),
                fetchPosts: (silent) => getSocial().fetchPosts(silent),
                createPost: (content: string, image_url) => getSocial().createPost(content, image_url),
                votePost: (postId, voteType) => getSocial().votePost(postId, voteType),
                addComment: (postId, content, parentId) => getSocial().addComment(postId, content, parentId),
                voteComment: (commentId, voteType) => getSocial().voteComment(commentId, voteType),
                deletePost: (postId) => getSocial().deletePost(postId),
                fetchStories: (silent) => getSocial().fetchStories(silent),
                createStory: (content, media_url, type, metadata) => getSocial().createStory(content, media_url, type, metadata),
                deleteStory: (storyId) => getSocial().deleteStory(storyId),
                addStoryReaction: (storyId, reaction) => getSocial().addStoryReaction(storyId, reaction),
                fetchFollowers: (silent) => getSocial().fetchFollowers(silent),
                fetchFollowing: (silent) => getSocial().fetchFollowing(silent),
                toggleFollow: (targetId) => getSocial().toggleFollow(targetId),
                fetchUserPosts: (uid) => getSocial().fetchUserPosts(uid),
                fetchUserComments: (uid) => getSocial().fetchUserComments(uid),
                fetchUserProfile: (uid) => getUserStore().fetchUserProfile(uid),
                _mapPost: (p, uid) => getSocial()._mapPost(p, uid),
                _mapComment: (c, uid) => getSocial()._mapComment(c, uid),
            };
        },
        {
            name: 'essential-command-storage',
            partialize: (state) => ({
                userId: state.userId,
                activities: state.activities,
                productivityScore: state.productivityScore,
                focusTimeToday: state.focusTimeToday,
                timerSeconds: state.timerSeconds,
                initialTimerSeconds: state.initialTimerSeconds,
            }),

        }
    )
);

// ─── Store Subscription Bridge (Backwards Compatibility) ──────────────────────

if (typeof window !== 'undefined') {
    // Sync Social Store -> Task Store (Shim)
    useSocialStore.subscribe((state) => {
        useTaskStore.setState({
            posts: state.posts,
            friends: state.friends,
            stories: state.stories,
            socialStats: state.socialStats,
            onlineIds: state.onlineIds,
            loadingPosts: state.loadingPosts,
            loadingStories: state.loadingStories,
            loadingSocial: state.loadingSocial,
            pendingRequests: state.pendingRequests,
            followers: state.followers,
            following: state.following,
            suggestedUsers: state.suggestedUsers,
        });
    });

    // Sync User Store -> Task Store (Shim)
    useUserStore.subscribe((state) => {
        useTaskStore.setState({
            isSyncing: state.isSyncing,
        });
    });
}
