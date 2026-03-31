/**
 * src/types/index.ts
 *
 * Single source of truth for all domain types across the Zenith Productivity app.
 *
 * Organised into three sections:
 *  1. Productivity Domain — Tasks, Habits, Focus Sessions, Activities
 *  2. Social Domain      — Posts, Comments, Stories, Friends, Follows
 *  3. Supabase DB Rows   — Raw row shapes that come back from the database,
 *                          used to type query results before mapping to domain types.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRODUCTIVITY DOMAIN
// ─────────────────────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type RecurringInterval = 'daily' | 'weekly' | 'monthly';

export type ActivityType =
    | 'task_created'
    | 'task_completed'
    | 'task_deleted'
    | 'task_reopened'
    | 'task_rescheduled'
    | 'task_missed'
    | 'task_updated'
    | 'tasks_reordered'
    | 'habit_created'
    | 'habit_completed'
    | 'habit_uncompleted'
    | 'habit_deleted'
    | 'timer_started'
    | 'timer_paused'
    | 'timer_reset'
    | 'focus_session_complete'
    | 'autopilot_generated'
    | 'guardian_broken'
    | 'guardian_success'
    | 'message_sent'
    | 'app_session_start'
    | 'app_used';

export interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    deadline?: string;       // ISO string
    priority: Priority;
    tags: string[];
    subtasks: SubTask[];
    completed: boolean;
    createdAt: string;       // ISO string
    completedAt?: string;    // ISO string
    recurring?: RecurringInterval;
    order: number;
    duration_estimate?: number;   // minutes
    scheduled_start?: string;     // ISO string
    scheduled_end?: string;       // ISO string
    is_auto_scheduled?: boolean;
}

export interface Habit {
    id: string;
    title: string;
    streak: number;
    completedToday: boolean;
    lastCompleted?: string;         // ISO string
    completedDates?: string[];      // Array of 'YYYY-MM-DD' strings
}

export interface FocusSession {
    id: string;
    taskId?: string;
    duration: number;    // minutes
    timestamp: string;   // ISO string
}

export interface Activity {
    id: string;
    type: ActivityType;
    title: string;
    timestamp: string;   // ISO string
    metadata?: ActivityMetadata;
}

/** Typed metadata per activity kind. Use discriminated union or index access as needed. */
export interface ActivityMetadata {
    taskId?: string;
    habitId?: string;
    date?: string;          // 'YYYY-MM-DD'
    streak?: number;
    duration?: number;      // minutes
    penalty?: number;
    bonus?: number;
    updates?: Partial<Task>;
    guardianMode?: boolean;
    [key: string]: unknown; // Allow extra keys without losing type safety on known ones
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SOCIAL DOMAIN
// ─────────────────────────────────────────────────────────────────────────────

export interface UserProfile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    is_online?: boolean;
    updated_at?: string;
    productivity_score?: number;
    status?: 'available' | 'focusing' | 'busy';
}

export interface UserProfileDetail extends UserProfile {
    followersCount: number;
    followingCount: number;
    postsCount: number;
    productivity_score: number;
    created_at: string;
}

export interface PostAuthor {
    id: string;
    username: string;
    full_name: string;
    avatar: string;        // mapped from avatar_url
    is_online: boolean;
    updated_at?: string;
}

export interface CommentAuthor {
    id: string;
    username: string;
    avatar: string;        // mapped from avatar_url
    is_online?: boolean;
    updated_at?: string;
}

export interface PostComment {
    id: string;
    postId: string;
    parentId?: string;
    author: CommentAuthor;
    content: string;
    userVote: number;    // 1, -1, or 0
    likes: number;
    liked: boolean;
    time: string;        // ISO string or 'Just now'
}

export interface Post {
    id: string;
    author: PostAuthor;
    time: string;         // ISO string or 'Just now'
    content: string;
    image?: string;
    video?: string;
    likes: number;
    userVote?: number;    // 1, -1, or 0
    commentsCount: number;
    shares: number;
    liked: boolean;
    comments: PostComment[];
    likes_count?: number; // Denormalized counter
    comments_count?: number; // Denormalized counter
}

export type StoryType = 'image' | 'video' | 'text' | 'wrap';

export interface StoryMetadata {
    bg?: string;
    color?: string;
    font?: string;
    // wrap-specific
    productivity?: number;
    focusTime?: number;
    tasksDone?: number;
    theme?: string;
}

export interface Story {
    id: string;
    userId: string;
    mediaUrl?: string;
    content?: string;
    type: StoryType;
    createdAt: string;    // ISO string
    author: {
        username: string;
        avatar: string;
    };
    reactions: Record<string, number>;   // emoji → count
    userReactions?: string[];
    metadata?: StoryMetadata;
}

export interface SocialStats {
    posts: number;
    followers: number;
    following: number;
}

export interface Friend extends UserProfile {
    // Currently same shape as UserProfile; kept as a named alias for clarity
}

export interface PendingFriendRequest {
    id: string;
    user_id: string;
    friend_id: string;
    status: 'pending';
    profiles: DbProfile;    // The requesting user's profile
}

export interface SuggestedUser {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    productivity_score?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SUPABASE DB ROW TYPES
//    These represent the raw shapes returned by Supabase queries.
//    They are used only inside store files during data mapping.
//    Domain-level components always work with the typed domain models above.
// ─────────────────────────────────────────────────────────────────────────────

/** profiles table row */
export interface DbProfile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    email?: string;
    productivity_score?: number;
    updated_at: string;
    created_at: string;
    status?: 'available' | 'focusing' | 'busy';
}

/** tasks table row */
export interface DbTask {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    priority: Priority;
    tags: string[];
    completed: boolean;
    completed_at?: string;
    deadline?: string;
    created_at: string;
    task_order: number;
    scheduled_start?: string;
    scheduled_end?: string;
    duration_estimate?: number;
    is_auto_scheduled: boolean;
}

/** habits table row */
export interface DbHabit {
    id: string;
    user_id: string;
    title: string;
    streak: number;
    completed_today: boolean;
    last_completed_at?: string;
}

/** focus_sessions table row */
export interface DbFocusSession {
    id: string;
    user_id: string;
    task_id?: string;
    duration_mins: number;
    completed_at: string;
}

/** activity_log table row */
export interface DbActivityLog {
    id: string;
    user_id: string;
    action_type: string;
    description: string;
    metadata: ActivityMetadata | string;   // DB stores as JSON, may arrive as string
    timestamp: string;
}

/** posts table row (with joined relations) */
export interface DbPost {
    id: string;
    user_id: string;
    content: string;
    image_url?: string;
    video_url?: string;
    created_at: string;
    profiles: DbProfile;       // joined via profiles!user_id
    post_votes: DbPostVote[];
    comments: DbComment[];
    likes_count?: number;
    comments_count?: number;
}

/** post_votes table row */
export interface DbPostVote {
    user_id: string;
    vote_type: number;
}

/** comments table row (with joined relations) */
export interface DbComment {
    id: string;
    post_id: string;
    user_id: string;
    parent_id?: string;
    content: string;
    created_at: string;
    profiles: DbProfile | DbProfile[];    // can be array depending on join syntax
    comment_votes: DbCommentVote[];
}

/** comment_votes table row */
export interface DbCommentVote {
    user_id: string;
    vote_type: number;
}

/** stories table row (with joined relations) */
export interface DbStory {
    id: string;
    user_id: string;
    content?: string;
    media_url?: string;
    type: StoryType;
    created_at: string;
    metadata?: StoryMetadata;
    profiles: DbProfile | DbProfile[];
    story_reactions: DbStoryReaction[];
}

/** story_reactions table row */
export interface DbStoryReaction {
    id: string;
    story_id: string;
    user_id: string;
    reaction: string;
}

/** friends table row (with joined profile) */
export interface DbFriend {
    id: string;
    user_id: string;
    friend_id: string;
    status: 'pending' | 'accepted';
    profiles: DbProfile;
}

/** follows table row (with joined profile) */
export interface DbFollow {
    profiles: DbProfile | DbProfile[];
}

/** messages table row */
export interface DbMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    read?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. UTILITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Extracts a single profile from a join that may return an array or object */
export type ExtractProfile<T> = T extends (infer U)[] ? U : T;

/** Make specific keys required */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Generic async action result */
export interface ActionResult<T = void> {
    success: boolean;
    message: string;
    data?: T;
}

/** Timer state shape */
export interface TimerState {
    isTimerRunning: boolean;
    timerSeconds: number;
    initialTimerSeconds: number;
    activeTaskId?: string;
    timerStartedAt?: number;  // Date.now() result
    guardianModeEnabled: boolean;
}
