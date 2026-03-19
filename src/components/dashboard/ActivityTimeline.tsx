"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    PlusCircle,
    Trash2,
    Clock,
    AlertTriangle,
    Flame,
    Zap,
    RefreshCw,
    ShieldCheck,
    ShieldAlert,
    Send,
    Edit3,
    ArrowUpDown
} from 'lucide-react';
import { useTaskStore, Activity } from '@/store/useTaskStore';
import { formatDistanceToNow } from 'date-fns';
import { LayoutGrid } from 'lucide-react';
import styles from './ActivityTimeline.module.css';

const activityIcons: Record<Activity['type'], React.ReactNode> = {
    task_created: <PlusCircle size={16} />,
    task_completed: <CheckCircle2 size={16} />,
    task_deleted: <Trash2 size={16} />,
    habit_completed: <Flame size={16} />,
    habit_created: <PlusCircle size={16} />,
    habit_deleted: <Trash2 size={16} />,
    timer_started: <Clock size={16} />,
    focus_session_complete: <CheckCircle2 size={16} />,
    task_missed: <AlertTriangle size={16} />,
    task_rescheduled: <Clock size={16} />,
    app_used: <LayoutGrid size={16} />,
    app_session_start: <LayoutGrid size={16} />,
    task_reopened: <PlusCircle size={16} />,
    task_updated: <Edit3 size={16} />,
    tasks_reordered: <ArrowUpDown size={16} />,
    habit_uncompleted: <RefreshCw size={16} />,
    timer_paused: <Clock size={16} />,
    timer_reset: <RefreshCw size={16} />,
    autopilot_generated: <Zap size={16} />,
    guardian_broken: <ShieldAlert size={16} />,
    guardian_success: <ShieldCheck size={16} />,
    message_sent: <Send size={16} />,
};


const activityColors: Record<Activity['type'], string> = {
    task_created: 'var(--status-info)',
    task_completed: 'var(--status-success)',
    task_deleted: 'var(--status-danger)',
    habit_completed: 'var(--status-warning)',
    habit_created: 'var(--status-info)',
    habit_deleted: 'var(--status-danger)',
    timer_started: 'var(--accent-primary)',
    focus_session_complete: 'var(--status-success)',
    task_missed: 'var(--status-danger)',
    task_rescheduled: 'var(--status-warning)',
    app_used: 'var(--accent-primary)',
    app_session_start: 'var(--accent-primary)',
    task_reopened: 'var(--status-info)',
    task_updated: 'var(--status-warning)',
    tasks_reordered: 'var(--accent-primary)',
    habit_uncompleted: 'var(--status-danger)',
    timer_paused: 'var(--status-warning)',
    timer_reset: 'var(--status-info)',
    autopilot_generated: 'var(--accent-primary)',
    guardian_broken: 'var(--status-danger)',
    guardian_success: 'var(--status-success)',
    message_sent: 'var(--status-info)',
};


interface ActivityTimelineProps {
    limit?: number;
}

export const ActivityTimeline = ({ limit }: ActivityTimelineProps) => {
    const allActivities = useTaskStore((state) => state.activities);
    const activities = limit ? allActivities.slice(0, limit) : allActivities;

    return (
        <div className={styles.container}>
            {activities.length > 0 ? (
                <div className={styles.timeline}>
                    {activities.map((activity, index) => (
                        <motion.div
                            key={activity.id}
                            className={styles.item}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div
                                className={styles.iconWrapper}
                                style={{ backgroundColor: activityColors[activity.type], color: '#fff' }}
                            >
                                {activityIcons[activity.type]}
                            </div>
                            <div className={styles.content}>
                                <div className={styles.title}>{activity.title}</div>
                                <div className={styles.meta}>
                                    {activity.type.replace('_', ' ')} • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className={styles.empty}>
                    <Clock size={32} />
                    <p>No recent activity. Start by completing a task!</p>
                </div>
            )}
        </div>
    );
};
