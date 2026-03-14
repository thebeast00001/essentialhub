"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import styles from './AIInsights.module.css';

export const AIInsights = () => {
    const { tasks, productivityScore } = useTaskStore();

    const insights = useMemo(() => {
        const list = [];

        if (productivityScore > 80) {
            list.push({
                icon: <TrendingUp size={18} />,
                text: "You're in a high-productivity flow! Keep this momentum.",
                color: 'var(--status-success)',
                type: 'growth'
            });
        }

        const missedCount = tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < new Date()).length;
        if (missedCount > 0) {
            list.push({
                icon: <AlertCircle size={18} />,
                text: `You have ${missedCount} missed deadlines. Consider rescheduling to clear your mind.`,
                color: 'var(--status-danger)',
                type: 'warning'
            });
        }

        if (tasks.length > 5) {
            list.push({
                icon: <Lightbulb size={18} />,
                text: "Morning hours seem to be your most productive period.",
                color: 'var(--status-info)',
                type: 'insight'
            });
        }

        list.push({
            icon: <Sparkles size={18} />,
            text: "Tip: Breaking large tasks into subtasks increases completion rate by 40%.",
            color: 'var(--accent-secondary)',
            type: 'tip'
        });

        return list;
    }, [tasks, productivityScore]);

    return (
        <div className={styles.container}>
            {insights.map((insight, index) => (
                <motion.div
                    key={index}
                    className={styles.insightCard}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                >
                    <div className={styles.icon} style={{ color: insight.color }}>{insight.icon}</div>
                    <p className={styles.text}>{insight.text}</p>
                </motion.div>
            ))}
        </div>
    );
};
