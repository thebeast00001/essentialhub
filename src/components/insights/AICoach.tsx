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
import { format, subWeeks, subDays, subMonths, startOfWeek, endOfWeek, startOfDay, isWithinInterval, getHours, getDay, isSameDay, startOfMonth } from 'date-fns';
import styles from './AICoach.module.css';
import { clsx } from 'clsx';
import { useAuth } from '@/hooks/useAuth';

import { Mail, Loader2, Check } from 'lucide-react';

interface AICoachProps {
    viewDate?: Date;
    timeRange?: string;
}

export const AICoach = ({ viewDate = new Date(), timeRange = 'weekly' }: AICoachProps) => {
    const { tasks, focusSessions, productivityScore, userId } = useTaskStore();
    const { user } = useAuth();

    // ── Pattern Analysis ────────────────────────────────────────────────────
    const analysis = useMemo(() => {
        const now = viewDate;
        const effectiveEnd = isSameDay(now, new Date()) ? new Date() : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        // ── Main dynamic range for the general AI cards (Insights/Suggestions)
        let mainStart: Date;
        if (timeRange === 'daily') mainStart = startOfDay(now);
        else if (timeRange === 'weekly') mainStart = startOfWeek(now, { weekStartsOn: 1 });
        else if (timeRange === 'monthly') mainStart = startOfMonth(now);
        else mainStart = new Date(now.getFullYear(), 0, 1);

        // ── Dedicated Weekly Stats for the bottom card
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = isSameDay(now, new Date()) ? new Date() : new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        
        const calcStats = (start: Date, end: Date) => {
            const rangeTasks = tasks.filter(t => {
                if (!t.completed || !t.completedAt) return false;
                const d = t.deadline ? new Date(t.deadline) : new Date(t.completedAt);
                return d >= start && d <= end;
            });
            const rangeSessions = focusSessions.filter(s => new Date(s.timestamp) >= start && new Date(s.timestamp) <= end);
            const focusMins = rangeSessions.reduce((acc, s) => acc + s.duration, 0);
            
            const missed = tasks.filter(t => {
                if (!t.deadline || t.completed) return false;
                const d = new Date(t.deadline);
                const currentTime = new Date();
                if (d < start || d > end) return false;
                if (d > currentTime) return false;
                return true;
            }).length;

            const score = (rangeTasks.length > 0 || focusMins > 0)
                ? Math.round(Math.min(100, (rangeTasks.length / 5 * 50) + (focusMins / 120 * 50)))
                : 0;

            return { taskCount: rangeTasks.length, focusMins, missed, score };
        };

        const mainStats = calcStats(mainStart, effectiveEnd);
        const weeklyStats = calcStats(weekStart, effectiveEnd);

        // Comparison for main analysis
        const prevRangeStart = timeRange === 'daily' ? subDays(mainStart, 1) : subWeeks(mainStart, 1);
        const prevStats = calcStats(prevRangeStart, new Date(mainStart.getTime() - 1));
        
        const taskIncr = prevStats.taskCount > 0 
            ? Math.round(((mainStats.taskCount - prevStats.taskCount) / prevStats.taskCount) * 100)
            : mainStats.taskCount > 0 ? 100 : 0;

        const focusIncr = prevStats.focusMins > 0 
            ? Math.round(((mainStats.focusMins - prevStats.focusMins) / prevStats.focusMins) * 100)
            : mainStats.focusMins > 0 ? 100 : 0;

        // Peak Hours (within main range)
        const hourlyStats = Array(24).fill(0);
        focusSessions.filter(s => new Date(s.timestamp) >= mainStart && new Date(s.timestamp) <= effectiveEnd).forEach(s => {
            const h = getHours(new Date(s.timestamp));
            hourlyStats[h] += s.duration;
        });
        const peakHour = hourlyStats.indexOf(Math.max(...hourlyStats));
        
        // Day Performance
        const dailyStats = Array(7).fill(0);
        focusSessions.filter(s => new Date(s.timestamp) >= mainStart && new Date(s.timestamp) <= effectiveEnd).forEach(s => {
            const d = getDay(new Date(s.timestamp));
            dailyStats[d] += s.duration;
        });
        const peakDayIdx = dailyStats.indexOf(Math.max(...dailyStats));
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Focus Streak Calculation
        const sortedUniqueDays = Array.from(new Set(
            focusSessions.map(s => format(new Date(s.timestamp), 'yyyy-MM-dd'))
        )).sort().reverse();
        
        let streak = 0;
        if (sortedUniqueDays.length > 0) {
            const today = format(new Date(), 'yyyy-MM-dd');
            const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
            
            if (sortedUniqueDays[0] === today || sortedUniqueDays[0] === yesterday) {
                let current = new Date(sortedUniqueDays[0]);
                for (const dayStr of sortedUniqueDays) {
                    if (format(new Date(dayStr), 'yyyy-MM-dd') === format(current, 'yyyy-MM-dd')) {
                        streak++;
                        current = subDays(current, 1);
                    } else {
                        break;
                    }
                }
            }
        }

        return {
            taskIncr,
            focusIncr,
            peakHour,
            peakDay: dayNames[peakDayIdx],
            mainStats,
            weeklyStats,
            focusStreak: streak
        };
    }, [tasks, focusSessions, viewDate, timeRange]);

    // ── Generate Dynamic Insights ───────────────────────────────────────────
    const insights = useMemo(() => {
        const list = [];

        // 1. Focus Trend - Dynamic based on magnitude
        if (analysis.focusIncr > 20) {
            list.push({
                icon: TrendingUp,
                title: 'Exceptional Momentum',
                text: `You've surged by ${analysis.focusIncr}% in focus time! This intense deep work is your unique competitive advantage.`,
                color: '#10b981'
            });
        } else if (analysis.focusIncr > 0) {
            list.push({
                icon: TrendingUp,
                title: 'Steady Progress',
                text: `A ${analysis.focusIncr}% increase in focus shows you're successfully refining your concentration habits.`,
                color: '#10b981'
            });
        }

        // 2. Task Completion Velocity
        if (analysis.taskIncr > 50) {
            list.push({
                icon: Zap,
                title: 'Task Crusher',
                text: `Your completion rate exploded by ${analysis.taskIncr}%! You're operating at peak efficiency right now.`,
                color: '#f59e0b'
            });
        }

        // 3. Peak Productivity - Personalized time-of-day
        if (analysis.peakHour !== -1 && analysis.mainStats.focusMins > 0) {
            const isMorning = analysis.peakHour < 12;
            const timeStr = analysis.peakHour % 12 || 12;
            const period = analysis.peakHour >= 12 ? 'PM' : 'AM';
            
            list.push({
                icon: Clock,
                title: isMorning ? 'Morning Warrior' : 'Evening Powerhouse',
                text: `Your biological prime starts around ${timeStr} ${period}. Protect this window for your "Deep Work" sessions.`,
                color: '#6366f1'
            });
        }

        // 4. Gold Day Analysis
        if (analysis.mainStats.taskCount > 0) {
            list.push({
                icon: Award,
                title: `${analysis.peakDay} Specialist`,
                text: `Statistically, you are most lethal on ${analysis.peakDay}s. Schedule your most complex projects for these days.`,
                color: '#ec4899'
            });
        }

        // 5. Warning Patterns - Fatigue or Overload
        if (analysis.mainStats.missed > 8) {
            list.push({
                icon: AlertCircle,
                title: 'Burnout Warning',
                text: `You have ${analysis.mainStats.missed} missed tasks. Your current workload might be unsustainable. Time to prune or delegate.`,
                color: '#ef4444'
            });
        } else if (analysis.mainStats.score < 50 && analysis.mainStats.missed > 2) {
            list.push({
                icon: Lightbulb,
                title: 'Productivity Dip',
                text: `Your completion rate is lower than usual. Try breaking your tasks into smaller, manageable chunks.`,
                color: '#f59e0b'
            });
        }

        // Fallback for new users
        if (list.length === 0) {
            list.push({
                icon: Brain,
                title: 'Analyzing baseline...',
                text: 'I am observing your work patterns to build your personalized productivity profile. Keep focusing!',
                color: '#8b5cf6'
            });
        }

        return list.slice(0, 3);
    }, [analysis]);

    // ── Generate Suggestions ───────────────────────────────────────────────
    const suggestions = useMemo(() => {
        const list = [];

        // 1. Dynamic Energy Blocking
        if (analysis.peakHour !== -1 && analysis.mainStats.focusMins > 0) {
            const h = analysis.peakHour;
            const period = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 || 12;
            list.push({
                title: 'High-Intensity Block',
                text: `Your focus peaks at ${displayH}${period}. Lock your calendar for 90 mins then to tackle your hardest task.`,
                action: 'Set Focus Goal'
            });
        }

        // 2. Overload Mitigation
        if (analysis.mainStats.missed > 0) {
            list.push({
                title: 'Backlog Pruning',
                text: `You have ${analysis.mainStats.missed} overdue items. Pruning the bottom 20% would instantly reduce your mental load.`,
                action: 'Review Overdue'
            });
        }

        // 3. Momentum Maintenance
        if (analysis.taskIncr < 0) {
            list.push({
                title: 'Reignite Momentum',
                text: 'Your completion rate is down this week. Try the "5-Minute Rule" for your next task.',
                action: 'Start 5m Focus'
            });
        } else {
            list.push({
                title: 'Performance Optimization',
                text: `You're dominant on ${analysis.peakDay}s. Consider stacking your most creative work then.`,
                action: 'Optimize Schedule'
            });
        }

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
                    <HighlightItem label="Best Focus Day" value={analysis.mainStats.taskCount > 0 ? analysis.peakDay : 'N/A'} />
                    <HighlightItem 
                        label="Best Focus Hour" 
                        value={analysis.mainStats.focusMins > 0 && analysis.peakHour !== -1 ? `${analysis.peakHour % 12 || 12}${analysis.peakHour >= 12 ? ' PM' : ' AM'}` : 'N/A'} 
                    />
                    <HighlightItem label="Focus Streak" value={`${analysis.focusStreak} Days`} />
                    <HighlightItem label="Efficiency" value={`${analysis.mainStats.score}%`} />
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
                        <ReportStat label="Focus Minutes" value={`${analysis.weeklyStats.focusMins}m`} />
                        <ReportStat label="Tasks Completed" value={analysis.weeklyStats.taskCount.toString()} />
                        <ReportStat label="Tasks Missed" value={analysis.weeklyStats.missed.toString()} />
                        <ReportStat label="Prod. Score" value={`${analysis.weeklyStats.score}%`} />
                    </div>

                    <p className={styles.reportFooter}>
                        &quot;This week you completed {analysis.weeklyStats.taskCount} tasks and focused for {Math.round(analysis.weeklyStats.focusMins / 60)} hours. 
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
