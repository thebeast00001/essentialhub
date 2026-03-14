"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    PlusCircle,
    Trash2,
    Clock,
    AlertTriangle,
    Flame
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
    app_session_start: <LayoutGrid size={16} />
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
    app_session_start: 'var(--accent-primary)'
};

export const ActivityTimeline = () => {
    const activities = useTaskStore((state) => state.activities);

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
