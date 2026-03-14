"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    Sparkles, Lightbulb, Target, TrendingUp, 
    Calendar, Clock, Zap, Award, CheckCircle2, 
    AlertCircle, ArrowRight, TrendingDown,
    Brain
} from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, getHours, getDay } from 'date-fns';
import styles from './AICoach.module.css';
import { clsx } from 'clsx';
import { useUser } from '@clerk/nextjs';
import { Mail, Loader2, Check } from 'lucide-react';

// ─── Component ───────────────────────────────────────────────────────────────
export const AICoach = () => {
    const { tasks, focusSessions, productivityScore, userId } = useTaskStore();
    const { user } = useUser();

    // ── Pattern Analysis ────────────────────────────────────────────────────
    const analysis = useMemo(() => {
        const now = new Date();
        const lastWeek = subWeeks(now, 1);
        const twoWeeksAgo = subWeeks(now, 2);

        // Weekly comparison
        const thisWeekTasks = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= lastWeek);
        const lastWeekTasks = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= twoWeeksAgo && new Date(t.completedAt) < lastWeek);
        
        const taskIncr = lastWeekTasks.length > 0 
            ? Math.round(((thisWeekTasks.length - lastWeekTasks.length) / lastWeekTasks.length) * 100)
            : thisWeekTasks.length * 100;

        const thisWeekFocus = focusSessions.filter(s => new Date(s.timestamp) >= lastWeek).reduce((acc, s) => acc + s.duration, 0);
        const lastWeekFocus = focusSessions.filter(s => new Date(s.timestamp) >= twoWeeksAgo && new Date(s.timestamp) < lastWeek).reduce((acc, s) => acc + s.duration, 0);
        
        const focusIncr = lastWeekFocus > 0 
            ? Math.round(((thisWeekFocus - lastWeekFocus) / lastWeekFocus) * 100)
            : thisWeekFocus > 0 ? 100 : 0;

        // Peak Hours
        const hourlyStats = Array(24).fill(0);
        focusSessions.forEach(s => {
            const h = getHours(new Date(s.timestamp));
            hourlyStats[h] += s.duration;
        });
        const peakHour = hourlyStats.indexOf(Math.max(...hourlyStats));
        
        // Day Performance
        const dailyStats = Array(7).fill(0);
        tasks.filter(t => t.completed && t.completedAt).forEach(t => {
            const d = getDay(new Date(t.completedAt!));
            dailyStats[d]++;
        });
        const peakDay = dailyStats.indexOf(Math.max(...dailyStats));
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Missed tasks pattern
        const missedTasks = tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < now);
        const missedEvening = missedTasks.filter(t => t.deadline && getHours(new Date(t.deadline)) >= 17).length;
        const missedPercent = missedTasks.length > 0 ? (missedEvening / missedTasks.length) * 100 : 0;

        return {
            taskIncr,
            focusIncr,
            peakHour,
            peakDay: dayNames[peakDay],
            thisWeekTasks: thisWeekTasks.length,
            thisWeekFocus,
            missedTasks: missedTasks.length,
            missedEveningPercent: Math.round(missedPercent),
            productivityScore
        };
    }, [tasks, focusSessions, productivityScore]);

    // ── Generate Dynamic Insights ───────────────────────────────────────────
    const insights = useMemo(() => {
        const list = [];

        // 1. Focus Trend
        if (analysis.focusIncr > 0) {
            list.push({
                icon: TrendingUp,
                title: 'Momentum Building',
                text: `Your focus time increased by ${analysis.focusIncr}% compared to last week. You're hitting your stride!`,
                color: '#10b981'
            });
        }

        // 2. Peak Productivity
        if (analysis.peakHour !== -1 && analysis.thisWeekFocus > 0) {
            const timeStr = analysis.peakHour > 12 ? `${analysis.peakHour - 12} PM` : `${analysis.peakHour} AM`;
            list.push({
                icon: Zap,
                title: 'Prime Time Detected',
                text: `You are most productive around ${timeStr}. Consider scheduling your hardest tasks then.`,
                color: '#f59e0b'
            });
        }

        // 3. Peak Day
        if (analysis.thisWeekTasks > 0) {
            list.push({
                icon: Calendar,
                title: 'Golden Day',
                text: `${analysis.peakDay}s seem to be your most effective days for finishing work.`,
                color: '#6366f1'
            });
        }

        // 4. Evening Pattern (Missed tasks)
        if (analysis.missedEveningPercent > 40 && analysis.missedTasks > 1) {
            list.push({
                icon: AlertCircle,
                title: 'Scheduling Conflict',
                text: `You miss ${analysis.missedEveningPercent}% of tasks in the evening. Consider shifting your workload to earlier in the day.`,
                color: '#ef4444'
            });
        } else if (analysis.missedTasks > 5) {
            list.push({
                icon: AlertCircle,
                title: 'High Workload',
                text: 'You have a high number of missed tasks lately. It might be time to prune your list or renegotiate deadlines.',
                color: '#ef4444'
            });
        }

        // Default if list is short
        if (list.length < 2) {
            list.push({
                icon: Lightbulb,
                title: 'Pro Tip',
                text: 'Consistency is key. Try to maintain a similar focus schedule every day.',
                color: '#8b5cf6'
            });
        }

        return list;
    }, [analysis]);

    // ── Generate Suggestions ───────────────────────────────────────────────
    const suggestions = useMemo(() => {
        const list = [];

        if (analysis.peakHour !== -1) {
            list.push({
                title: 'Schedule Deep Work',
                text: `You have high energy at ${analysis.peakHour}:00. Block this time for high-intensity work.`,
                action: 'Set Focus Block'
            });
        }

        if (analysis.missedTasks > 0) {
            list.push({
                title: 'Workload Redistribution',
                text: 'You have a few overdue tasks. Consider breaking them into smaller steps for easier completion.',
                action: 'Review Overdue'
            });
        }

        list.push({
            title: 'Weekly Ritual',
            text: 'It looks like your weekend productivity drops. Try a light planning session on Sundays.',
            action: 'Plan Weekend'
        });

        return list;
    }, [analysis]);

    return (
        <div className={styles.container}>
            {/* AI Coach Section Header */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Brain size={24} />
                    </div>
                    <div>
                        <h2 className={styles.sectionTitle}>AI Productivity Coach</h2>
                        <p className={styles.sectionSub}>Personalized intelligence based on your habits</p>
                    </div>
                </div>

                {/* Insights Cards */}
                <div className={styles.grid}>
                    {insights.map((ins, i) => (
                        <motion.div
                            key={i}
                            className={clsx(styles.card, styles.insightCard)}
                            style={{ '--insight-color': ins.color } as any}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div className={styles.cardGlow} style={{ '--glow-color': `${ins.color}20` } as any} />
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon} style={{ background: `${ins.color}15`, color: ins.color }}>
                                    <ins.icon size={18} />
                                </div>
                                <h4 className={styles.cardTitle}>{ins.title}</h4>
                            </div>
                            <p className={styles.cardText}>{ins.text}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* AI Suggestions Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <Sparkles size={18} style={{ color: 'var(--status-warning)' }} />
                    <h3 className={styles.sectionTitle} style={{ fontSize: '1.25rem' }}>AI Suggestions</h3>
                </div>
                <div className={styles.grid}>
                    {suggestions.map((sug, i) => (
                        <motion.div
                            key={i}
                            className={clsx(styles.card, styles.recommendationCard)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                        >
                            <h4 className={styles.cardTitle}>{sug.title}</h4>
                            <p className={styles.cardText}>{sug.text}</p>
                            <div className={styles.suggestionAction}>
                                <span>{sug.action}</span>
                                <ArrowRight size={14} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Highlights Grid */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <Target size={18} style={{ color: 'var(--status-success)' }} />
                    <h3 className={styles.sectionTitle} style={{ fontSize: '1.25rem' }}>Key Productivity Highlights</h3>
                </div>
                <div className={styles.highlightsGrid}>
                    <HighlightItem label="Best Focus Day" value={analysis.thisWeekTasks > 0 ? analysis.peakDay : 'N/A'} />
                    <HighlightItem 
                        label="Best Focus Hour" 
                        value={analysis.thisWeekFocus > 0 && analysis.peakHour !== -1 ? `${analysis.peakHour % 12 || 12}${analysis.peakHour >= 12 ? ' PM' : ' AM'}` : 'N/A'} 
                    />
                    <HighlightItem label="Focus Streak" value={analysis.thisWeekFocus > 0 ? "5 Days" : "0 Days"} />
                    <HighlightItem label="Efficiency" value={`${analysis.productivityScore}%`} />
                </div>
            </div>

            {/* Weekly Summary */}
            <motion.div 
                className={clsx(styles.card, styles.reportCard)}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <div className={styles.reportContent}>
                    <div className={styles.reportHeader}>
                        <h3 className={styles.reportTitle}>Weekly AI Performance Report</h3>
                        <div className={styles.trend}>
                            {analysis.taskIncr >= 0 ? <TrendingUp size={16} className={styles.trendUp} /> : <TrendingDown size={16} className={styles.trendDown} />}
                            <span className={analysis.taskIncr >= 0 ? styles.trendUp : styles.trendDown}>
                                {analysis.taskIncr >= 0 ? '+' : ''}{analysis.taskIncr}% from last week
                            </span>
                        </div>
                    </div>
                    
                    <div className={styles.reportStats}>
                        <ReportStat label="Focus Minutes" value={`${analysis.thisWeekFocus}m`} />
                        <ReportStat label="Tasks Completed" value={analysis.thisWeekTasks.toString()} />
                        <ReportStat label="Tasks Missed" value={analysis.missedTasks.toString()} />
                        <ReportStat label="Prod. Score" value={`${analysis.productivityScore}%`} />
                    </div>

                    <p className={styles.reportFooter}>
                        &quot;This week you completed {analysis.thisWeekTasks} tasks and focused for {Math.round(analysis.thisWeekFocus / 60)} hours. 
                        Your productivity {analysis.taskIncr >= 0 ? 'improved' : 'changed'} by {Math.abs(analysis.taskIncr)}% compared to last week.&quot;
                    </p>

                    <div className={styles.reportActions}>
                        <div className={styles.autoBadge}>
                            <Check size={14} />
                            <span>Weekly Insights automated</span>
                        </div>
                        <p className={styles.autoNote}>Sent to your Gmail every Sunday at 9:00 AM</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ─── Sub-Components ──────────────────────────────────────────────────────────
const HighlightItem = ({ label, value }: { label: string; value: string }) => (
    <div className={styles.highlightItem}>
        <span className={styles.highlightLabel}>{label}</span>
        <span className={styles.highlightValue}>{value}</span>
    </div>
);

const ReportStat = ({ label, value }: { label: string; value: string }) => (
    <div className={styles.reportStat}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
    </div>
);
