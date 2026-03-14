import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Activity {
    id: string;
    type: 'task_created' | 'task_completed' | 'task_deleted' | 'habit_completed' | 'habit_created' | 'habit_deleted' | 'timer_started' | 'focus_session_complete' | 'task_missed' | 'task_rescheduled' | 'app_used' | 'app_session_start';
    title: string;
    timestamp: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    deadline?: string;
    priority: Priority;
    tags: string[];
    subtasks: SubTask[];
    completed: boolean;
    createdAt: string;
    completedAt?: string;
    recurring?: 'daily' | 'weekly' | 'monthly';
    order: number;
}

export interface Habit {
    id: string;
    title: string;
    streak: number;
    completedToday: boolean;
    lastCompleted?: string;
}

export interface FocusSession {
    id: string;
    taskId?: string;
    duration: number; // in minutes
    timestamp: string;
}

interface TaskState {
    tasks: Task[];
    habits: Habit[];
    activities: Activity[];
    focusSessions: FocusSession[];
    productivityScore: number;
    focusTimeToday: number; // in minutes
    isTimerRunning: boolean;
    timerSeconds: number;
    initialTimerSeconds: number;
    activeTaskId?: string;
    userId?: string;
    isSyncing: boolean;
    friends: any[];
    pendingRequests: any[];
    lastPresenceUpdate: number;

    setUserId: (userId: string) => void;
    syncProfile: (profile: { email: string; username: string; full_name: string; avatar_url: string }) => Promise<void>;
    logActivity: (action_type: string, description: string, metadata?: any) => Promise<void>;
    initializeSupabase: () => void;
    fetchData: () => Promise<void>;

    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'order'>) => void;
    toggleTask: (id: string) => void;
    deleteTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    reorderTasks: (newTasks: Task[]) => void;

    addHabit: (title: string) => void;
    toggleHabit: (id: string) => void;
    deleteHabit: (id: string) => void;

    startTimer: (taskId?: string) => void;
    stopTimer: () => void;
    resetTimer: () => void;
    tickTimer: () => void;
    setTimerDuration: (seconds: number) => void;
    setActiveTask: (taskId?: string) => void;

    addFocusTime: (minutes: number, taskId?: string) => void;
    addActivity: (type: Activity['type'], title: string) => void;
    calculateProductivityScore: () => void;
    getSuggestedTasks: () => string[];

    // Social Actions
    fetchFriends: () => Promise<void>;
    addFriendByUsername: (username: string) => Promise<{ success: boolean; message: string }>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    sendMessage: (friendId: string, message: string) => Promise<void>;
    inviteToStudyRoom: (friendId: string, roomId: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
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
            isSyncing: false,
            friends: [],
            pendingRequests: [],
            lastPresenceUpdate: 0,

            setUserId: (userId: string) => {
                set({ userId });
                get().fetchData();
                get().fetchFriends();
                get().initializeSupabase();
                get().logActivity('app_session_start', 'User opened the application');
            },

            syncProfile: async (profile) => {
                const { userId } = get();
                if (!userId) return;

                await supabase.from('profiles').upsert({
                    id: userId,
                    email: profile.email,
                    username: profile.username,
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                    updated_at: new Date().toISOString()
                });
                
                set({ lastPresenceUpdate: Date.now() });
            },

            logActivity: async (action_type, description, metadata = {}) => {
                const { userId } = get();
                if (!userId) return;

                await supabase.from('activity_log').insert({
                    user_id: userId,
                    action_type,
                    description,
                    metadata,
                    timestamp: new Date().toISOString()
                });
            },

            initializeSupabase: () => {
                const { userId } = get();
                if (!userId) return;

                supabase
                    .channel('schema-db-changes')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => {
                        get().fetchData();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => {
                        get().fetchData();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `friend_id=eq.${userId}` }, () => {
                        get().fetchFriends();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${userId}` }, () => {
                        get().fetchFriends();
                    })
                    .subscribe();
            },

            fetchData: async () => {
                const { userId } = get();
                if (!userId) return;

                set({ isSyncing: true });

                const { data: tasks, error: taskErr } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: true });

                const { data: habits, error: habitErr } = await supabase
                    .from('habits')
                    .select('*')
                    .eq('user_id', userId);

                const { data: sessions, error: sessionErr } = await supabase
                    .from('focus_sessions')
                    .select('*')
                    .eq('user_id', userId);

                const { data: logEntries, error: logErr } = await supabase
                    .from('activity_log')
                    .select('*')
                    .eq('user_id', userId)
                    .order('timestamp', { ascending: false })
                    .limit(50);

                if (taskErr) console.error("Sync Error (Tasks):", taskErr.message);
                if (habitErr) console.error("Sync Error (Habits):", habitErr.message);
                if (sessionErr) console.error("Sync Error (Sessions):", sessionErr.message);
                if (logErr) console.error("Sync Error (Logs):", logErr.message);

                if (tasks) {
                    set({
                        tasks: tasks.map(t => ({
                            id: t.id,
                            title: t.title,
                            description: t.description,
                            deadline: t.deadline,
                            priority: t.priority as Priority,
                            tags: t.tags || [],
                            subtasks: [],
                            completed: t.completed,
                            createdAt: t.created_at,
                            completedAt: t.completed_at,
                            order: t.task_order
                        }))
                    });
                }

                if (habits) {
                    set({
                        habits: habits.map(h => ({
                            id: h.id,
                            title: h.title,
                            streak: h.streak,
                            completedToday: h.completed_today,
                            lastCompleted: h.last_completed_at
                        }))
                    });
                }

                if (sessions) {
                    const today = new Date().toDateString();
                    const sessionsMapped = sessions.map(s => ({
                        id: s.id,
                        taskId: s.task_id,
                        duration: s.duration_mins,
                        timestamp: s.completed_at
                    }));
                    
                    const todayMinutes = sessionsMapped
                        .filter(s => new Date(s.timestamp).toDateString() === today)
                        .reduce((acc, s) => acc + s.duration, 0);

                    set({
                        focusSessions: sessionsMapped,
                        focusTimeToday: todayMinutes
                    });
                }

                if (logEntries) {
                    set({
                        activities: logEntries
                            .filter(l => l.action_type !== 'app_session_start' && l.action_type !== 'app_used')
                            .map(l => ({
                                id: l.id,
                                type: l.action_type as any,
                                title: l.description,
                                timestamp: l.timestamp
                            }))
                    });
                }

                set({ isSyncing: false });
                get().calculateProductivityScore();
            },

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
                        description: newTask.description,
                        priority: newTask.priority,
                        tags: newTask.tags,
                        deadline: newTask.deadline || null,
                        completed: false
                    });
                    if (error) console.error("Database Insert Error:", error.message);
                }
            },

            toggleTask: async (id) => {
                const { userId, tasks } = get();
                const task = tasks.find(t => t.id === id);
                if (!task) return;

                const newCompleted = !task.completed;
                const completedAt = newCompleted ? new Date().toISOString() : undefined;

                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === id
                            ? { ...t, completed: newCompleted, completedAt }
                            : t
                    ),
                }));

                if (newCompleted) {
                    get().addActivity('task_completed', task.title);
                    get().logActivity('task_completed', `Completed task: ${task.title}`, { taskId: id });
                } else {
                    get().logActivity('task_reopened', `Reopened task: ${task.title}`, { taskId: id });
                }

                get().calculateProductivityScore();

                if (userId) {
                    await supabase.from('tasks')
                        .update({ completed: newCompleted, completed_at: completedAt })
                        .eq('id', id);
                }
            },

            deleteTask: async (id) => {
                const { userId, tasks } = get();
                const task = tasks.find(t => t.id === id);
                if (task) {
                    get().addActivity('task_deleted', task.title);
                    get().logActivity('task_deleted', `Deleted task: ${task.title}`, { taskId: id });
                }
                set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
                get().calculateProductivityScore();

                if (userId) {
                    await supabase.from('tasks').delete().eq('id', id);
                }
            },

            updateTask: async (id, updates) => {
                const { userId, tasks } = get();
                const task = tasks.find(t => t.id === id);
                set((state) => ({
                    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
                }));

                get().logActivity('task_updated', `Updated task: ${task?.title}`, { taskId: id, updates });

                if (userId) {
                    const dbUpdates: any = {};
                    if (updates.title) dbUpdates.title = updates.title;
                    if (updates.description !== undefined) dbUpdates.description = updates.description;
                    if (updates.priority) dbUpdates.priority = updates.priority;
                    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline || null;
                    
                    if (Object.keys(dbUpdates).length > 0) {
                        await supabase.from('tasks').update(dbUpdates).eq('id', id);
                    }
                }
            },

            reorderTasks: (newTasks) => {
                set({ tasks: newTasks });
                get().logActivity('tasks_reordered', 'Reordered task pipeline');
            },

            addHabit: async (title) => {
                const { userId } = get();
                const newHabit: Habit = {
                    id: crypto.randomUUID(),
                    title,
                    streak: 0,
                    completedToday: false,
                };
                set((state) => ({ habits: [...state.habits, newHabit] }));
                get().logActivity('habit_created', `Created new ritual: ${title}`, { habitId: newHabit.id });

                if (userId) {
                    await supabase.from('habits').insert({
                        id: newHabit.id,
                        user_id: userId,
                        title: newHabit.title,
                        streak: 0,
                        completed_today: false
                    });
                }
            },

            toggleHabit: async (id) => {
                const { userId, habits } = get();
                const habit = habits.find(h => h.id === id);
                if (!habit) return;

                const completedToday = !habit.completedToday;
                const streak = completedToday ? habit.streak + 1 : Math.max(0, habit.streak - 1);
                const lastCompleted = completedToday ? new Date().toISOString() : habit.lastCompleted;

                set((state) => ({
                    habits: state.habits.map((h) =>
                        h.id === id ? { ...h, completedToday, streak, lastCompleted } : h
                    ),
                }));

                if (completedToday) {
                    get().addActivity('habit_completed', habit.title);
                    get().logActivity('habit_completed', `Performed ritual: ${habit.title}`, { habitId: id, streak });
                } else {
                    get().logActivity('habit_uncompleted', `Undo ritual: ${habit.title}`, { habitId: id });
                }

                get().calculateProductivityScore();

                if (userId) {
                    await supabase.from('habits')
                        .update({ 
                            completed_today: completedToday, 
                            streak, 
                            last_completed_at: lastCompleted 
                        })
                        .eq('id', id);
                }
            },

            deleteHabit: async (id) => {
                const { userId, habits } = get();
                const habit = habits.find(h => h.id === id);
                set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }));
                get().logActivity('habit_deleted', `Deleted ritual: ${habit?.title}`, { habitId: id });

                if (userId) {
                    await supabase.from('habits').delete().eq('id', id);
                }
            },

            startTimer: (taskId) => {
                const task = get().tasks.find(t => t.id === taskId);
                set({ isTimerRunning: true, activeTaskId: taskId || get().activeTaskId });
                get().logActivity('timer_started', `Started focus session${task ? `: ${task.title}` : ''}`, { taskId });
            },
            stopTimer: () => {
                set({ isTimerRunning: false });
                get().logActivity('timer_paused', 'Paused focus session');
            },
            resetTimer: () => {
                set((state) => ({ isTimerRunning: false, timerSeconds: state.initialTimerSeconds }));
                get().logActivity('timer_reset', 'Reset focus timer');
            },
            tickTimer: () => {
                const { timerSeconds, isTimerRunning, initialTimerSeconds, activeTaskId } = get();
                if (isTimerRunning && timerSeconds > 0) {
                    set({ timerSeconds: timerSeconds - 1 });
                    if (timerSeconds === 1) {
                        const durationMins = Math.floor(initialTimerSeconds / 60);
                        set({ isTimerRunning: false, timerSeconds: initialTimerSeconds });
                        get().addFocusTime(durationMins, activeTaskId);
                        get().addActivity('task_completed', 'Completed Focus Session');
                    }
                }
            },

            addFocusTime: async (minutes, taskId) => {
                const { userId, tasks } = get();
                const task = tasks.find(t => t.id === taskId);
                const newSession: FocusSession = {
                    id: crypto.randomUUID(),
                    taskId,
                    duration: minutes,
                    timestamp: new Date().toISOString(),
                };
                set((state) => ({ 
                    focusTimeToday: state.focusTimeToday + minutes,
                    focusSessions: [...state.focusSessions, newSession]
                }));
                get().calculateProductivityScore();
                get().logActivity('focus_session_complete', `Completed ${minutes}m focus session${task ? `: ${task.title}` : ''}`, { taskId, duration: minutes });

                if (userId) {
                    await supabase.from('focus_sessions').insert({
                        id: newSession.id,
                        user_id: userId,
                        task_id: taskId,
                        duration_mins: minutes,
                        completed_at: newSession.timestamp
                    });
                }
            },

            addActivity: (type, title) => {
                const newActivity: Activity = {
                    id: crypto.randomUUID(),
                    type,
                    title,
                    timestamp: new Date().toISOString(),
                };
                set((state) => ({
                    activities: [newActivity, ...state.activities].slice(0, 50)
                }));
            },

            setTimerDuration: (seconds: number) => {
                const cappedSeconds = Math.max(10, Math.min(36000, seconds));
                set({
                    initialTimerSeconds: cappedSeconds,
                    timerSeconds: cappedSeconds,
                    isTimerRunning: false
                });
            },
            setActiveTask: (taskId) => set({ activeTaskId: taskId }),

            calculateProductivityScore: () => {
                const { tasks, habits, focusTimeToday } = get();
                if (tasks.length === 0 && habits.length === 0) {
                    set({ productivityScore: 0 });
                    return;
                }

                const completedTasks = tasks.filter(t => t.completed).length;
                const totalTasks = tasks.length;
                const taskRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;

                const habitRatio = habits.length > 0 ? habits.filter(h => h.completedToday).length / habits.length : 0;

                const focusBonus = Math.min(0.3, (focusTimeToday / 30) * 0.1);
                const score = Math.round(Math.min(100, (taskRatio * 0.5 + habitRatio * 0.3 + focusBonus) * 100));
                set({ productivityScore: score });
            },

            getSuggestedTasks: () => {
                const { activities } = get();
                const taskTitles = activities
                    .filter(a => a.type === 'task_created')
                    .map(a => a.title);
                
                const counts: Record<string, number> = {};
                taskTitles.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
                
                const suggestions = Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .filter(([_, count]) => count >= 2)
                    .map(([title]) => title)
                    .slice(0, 5);
                    
                if (suggestions.length === 0) {
                    return ['Check Emails', 'Daily Standup', 'Review PRs', 'Plan Tomorrow'];
                }
                return suggestions;
            },

            // Social Implementation
            fetchFriends: async () => {
                const { userId } = get();
                if (!userId) return;

                // Fetch accepted friends with profile data and progress
                const { data: friendsData, error: friendsErr } = await supabase
                    .from('friends')
                    .select('*, profiles!friend_id(id, username, full_name, avatar_url, productivity_score, updated_at)')
                    .eq('user_id', userId)
                    .eq('status', 'accepted');

                // Fetch pending requests sent TO user
                const { data: requestsData, error: requestsErr } = await supabase
                    .from('friends')
                    .select('*, profiles!user_id(*)')
                    .eq('friend_id', userId)
                    .eq('status', 'pending');

                if (friendsErr) console.error("Fetch Friends Error:", friendsErr.message);
                if (requestsErr) console.error("Fetch Requests Error:", requestsErr.message);

                if (friendsData) {
                    const mappedFriends = friendsData.map(f => {
                        const profile = f.profiles;
                        const lastSeen = new Date(profile.updated_at).getTime();
                        const isOnline = Date.now() - lastSeen < 300000; // 5 minutes
                        return { ...profile, is_online: isOnline };
                    });
                    set({ friends: mappedFriends });
                }
                if (requestsData) set({ pendingRequests: requestsData });
            },

            addFriendByUsername: async (username: string) => {
                const { userId } = get();
                if (!userId) return { success: false, message: 'Must be logged in' };

                // 1. Find user by username (case-insensitive)
                const { data: targetUser, error: findErr } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .ilike('username', username)
                    .maybeSingle();

                if (findErr) {
                    console.error("Find User Error:", findErr.message);
                    return { success: false, message: `Search error: ${findErr.message}` };
                }

                if (!targetUser) {
                    return { success: false, message: 'User not found. Check the spelling or invite them!' };
                }

                if (targetUser.id === userId) {
                    return { success: false, message: 'You cannot add yourself' };
                }

                // 2. Check if already friends or request exists
                const { data: existing, error: checkErr } = await supabase
                    .from('friends')
                    .select('*')
                    .or(`and(user_id.eq.${userId},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${userId})`)
                    .maybeSingle();

                if (checkErr) {
                    console.error("Check Friends Error:", checkErr.message);
                }

                if (existing) {
                    return { success: false, message: 'Request already exists or you are already friends' };
                }

                // 3. Send request
                const { error: sendErr } = await supabase
                    .from('friends')
                    .insert({
                        user_id: userId,
                        friend_id: targetUser.id,
                        status: 'pending'
                    });

                if (sendErr) {
                    console.error("Insert Friend Error:", sendErr.message);
                    return { success: false, message: `System error: ${sendErr.message}` };
                }

                return { success: true, message: `Friend request sent to @${username}` };
            },

            acceptFriendRequest: async (requestId: string) => {
                const { error } = await supabase
                    .from('friends')
                    .update({ status: 'accepted' })
                    .eq('id', requestId);

                if (!error) {
                    // Create reciprocal relationship for easy fetching
                    const req = get().pendingRequests.find(r => r.id === requestId);
                    if (req) {
                        await supabase.from('friends').insert({
                            user_id: req.friend_id,
                            friend_id: req.user_id,
                            status: 'accepted'
                        });
                    }
                    get().fetchFriends();
                }
            },

            sendMessage: async (friendId: string, message: string) => {
                const { userId } = get();
                if (!userId) return;

                const { error } = await supabase
                    .from('messages')
                    .insert({
                        sender_id: userId,
                        receiver_id: friendId,
                        content: message,
                        created_at: new Date().toISOString()
                    });

                if (error) console.error("Send Message Error:", error.message);
                else {
                    get().logActivity('message_sent', `Sent message to a friend`);
                }
            },

            inviteToStudyRoom: async (friendId: string, roomId: string) => {
                const { userId, friends } = get();
                if (!userId) return;

                const friend = friends.find(f => f.id === friendId);
                const roomName = roomId === 'general' ? 'General Study Room' : roomId;

                const { error } = await supabase
                    .from('messages')
                    .insert({
                        sender_id: userId,
                        receiver_id: friendId,
                        content: `[STUDY_INVITE]${roomId}|Join my study session in ${roomName}! 🚀`,
                        created_at: new Date().toISOString()
                    });

                if (error) {
                    console.error("Invite Error:", error.message);
                    throw error;
                } else {
                    get().logActivity('app_used', `Sent study invite to ${friend?.username || 'a friend'}`);
                }
            }
        }),
        {
            name: 'essential-command-storage',
            partialize: (state) => ({ 
                activities: state.activities,
                productivityScore: state.productivityScore,
                focusTimeToday: state.focusTimeToday,
                timerSeconds: state.timerSeconds,
                initialTimerSeconds: state.initialTimerSeconds
            }),
        }
    )
);
