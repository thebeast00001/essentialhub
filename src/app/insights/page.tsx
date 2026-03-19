"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    PieChart, Pie, Cell, RadialBarChart, RadialBar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import {
    BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle2,
    XCircle, Zap, Calendar, Download, Filter, ChevronDown,
    Lightbulb, Target, Activity, Award, ArrowUpRight,
    ArrowDownRight, Minus, RefreshCw, FileText, FileSpreadsheet,
    Star, Sun, Moon, Coffee, Sparkles
} from 'lucide-react';
import { useTaskStore, Task } from '@/store/useTaskStore';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, getHours, startOfMonth, endOfMonth, isSameDay, isSameWeek, isSameMonth, startOfWeek, endOfWeek, addDays } from 'date-fns';
import styles from './Insights.module.css';
import { clsx } from 'clsx';
import { AICoach } from '@/components/insights/AICoach';

// ─── Types ───────────────────────────────────────────────────────────────────
type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ChartType = 'bar' | 'line' | 'area';
type DistributionChart = 'pie' | 'donut' | 'radial';
type FilterCategory = 'all' | 'work' | 'study' | 'health' | 'personal';
type FilterPriority = 'all' | 'low' | 'medium' | 'high' | 'critical';

// ─── Color Palette ───────────────────────────────────────────────────────────
const CHART_COLORS = {
    primary: '#6366f1',
    secondary: '#818cf8',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#a855f7',
    pink: '#ec4899',
};

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className={styles.tooltip}>
            <p className={styles.tooltipLabel}>{label}</p>
            {payload.map((entry: any, i: number) => (
                <div key={i} className={styles.tooltipRow}>
                    <span className={styles.tooltipDot} style={{ background: entry.color }} />
                    <span className={styles.tooltipKey}>{entry.name}:</span>
                    <span className={styles.tooltipValue}>{entry.value}{entry.unit || ''}</span>
                </div>
            ))}
        </div>
    );
};

const AUTO_INSIGHTS = [
    { icon: Lightbulb, color: '#f59e0b', title: 'Focus Tip', text: 'Work in 45-minute blocks for optimal cognitive performance.' },
    { icon: Target, color: '#10b981', title: 'Strategy', text: 'Complete your most critical task first thing in the morning.' },
    { icon: Sparkles, color: '#6366f1', title: 'Essential Habit', text: 'Consistent daily habits are the foundation of excellence.' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InsightsPage() {
    const { tasks, focusSessions, productivityScore, activities } = useTaskStore();

    const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
    const [viewDate, setViewDate] = useState(new Date());
    const [focusChartType, setFocusChartType] = useState<ChartType>('area');
    const [taskChartType, setTaskChartType] = useState<ChartType>('bar');
    const [distChartType, setDistChartType] = useState<DistributionChart>('donut');
    const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
    const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // ─── Shared Utilities ───────────────────────────────────────────
    const isActuallyMissed = useCallback((t: Task, start: Date, end: Date) => {
        if (!t.deadline || t.completed) return false;
        const d = new Date(t.deadline);
        const now = new Date();
        if (d < start || d > end) return false;
        if (d > now) return false;
        return true;
    }, []);

    const aggregateData = useCallback((range: TimeRange, targetDate: Date = viewDate) => {
        if (range === 'weekly') {
            const daysLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
            return daysLabels.map((label, i) => {
                const sDate = addDays(weekStart, i);
                const sStart = startOfDay(sDate);
                const sEnd = endOfDay(sDate);
                const focus = focusSessions.filter(s => isSameDay(new Date(s.timestamp), sDate)).reduce((acc, s) => acc + s.duration, 0);
                const completed = tasks.filter(t => {
                    if (!t.completed || !t.completedAt) return false;
                    const dateToUse = t.deadline ? new Date(t.deadline) : new Date(t.completedAt);
                    return isSameDay(dateToUse, sDate);
                }).length;
                const missed = tasks.filter(t => isActuallyMissed(t, sStart, sEnd)).length;
                return { label, hour: label, focus, completed, missed, productivity: Math.round(Math.min(100, (focus / 120 * 50) + (completed / 5 * 50))) };
            });
        }
        
        if (range === 'daily') {
            return Array.from({ length: 24 }, (_, i) => {
                const hStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), i, 0, 0);
                const hEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), i, 59, 59, 999);
                const focus = focusSessions.filter(s => {
                    const d = new Date(s.timestamp);
                    return isSameDay(d, targetDate) && d.getHours() === i;
                }).reduce((acc, s) => acc + s.duration, 0);
                const completed = tasks.filter(t => {
                    if (!t.completed || !t.completedAt) return false;
                    const dateToUse = t.deadline ? new Date(t.deadline) : new Date(t.completedAt);
                    return isSameDay(dateToUse, targetDate) && dateToUse.getHours() === i;
                }).length;
                const missed = tasks.filter(t => isActuallyMissed(t, hStart, hEnd)).length;
                const hLabel = `${i % 12 || 12}${i >= 12 ? 'PM' : 'AM'}`;
                const prod = Math.min(100, (focus / 30 * 50) + (completed * 50));
                return { label: hLabel, hour: hLabel, focus, completed, missed, productivity: Math.round(prod) };
            });
        }

        if (range === 'monthly') {
            const dMonth = endOfMonth(targetDate).getDate();
            return Array.from({ length: dMonth }, (_, i) => {
                const dayNum = i + 1;
                const sDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), dayNum);
                const focus = focusSessions.filter(s => isSameDay(new Date(s.timestamp), sDate)).reduce((acc, s) => acc + s.duration, 0);
                const completed = tasks.filter(t => {
                    if (!t.completed || !t.completedAt) return false;
                    const dateToUse = t.deadline ? new Date(t.deadline) : new Date(t.completedAt);
                    return isSameDay(dateToUse, sDate);
                }).length;
                const missed = tasks.filter(t => isActuallyMissed(t, startOfDay(sDate), endOfDay(sDate))).length;
                return { label: `${dayNum}`, hour: `${dayNum}`, focus, completed, missed, productivity: Math.round(Math.min(100, (focus / 120 * 50) + (completed / 5 * 50))) };
            });
        }

        if (range === 'yearly') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months.map((label, i) => {
                const focus = focusSessions.filter(s => new Date(s.timestamp).getMonth() === i && new Date(s.timestamp).getFullYear() === targetDate.getFullYear()).reduce((acc, s) => acc + s.duration, 0);
                const completed = tasks.filter(t => {
                    if (!t.completed || !t.completedAt) return false;
                    const dateToUse = t.deadline ? new Date(t.deadline) : new Date(t.completedAt);
                    return dateToUse.getMonth() === i && dateToUse.getFullYear() === targetDate.getFullYear();
                }).length;
                const missed = tasks.filter(t => {
                    if (!t.deadline || t.completed) return false;
                    const d = new Date(t.deadline);
                    return d.getMonth() === i && d.getFullYear() === targetDate.getFullYear() && isActuallyMissed(t, startOfMonth(d), endOfMonth(d));
                }).length;
                return { label, hour: label, focus, completed, missed, productivity: Math.round(Math.min(100, (focus / 500 * 50) + (completed / 20 * 50))) };
            });
        }

        return [];
    }, [tasks, focusSessions, viewDate, isActuallyMissed]);

    const metrics = useMemo(() => {
        const now = viewDate;
        const rangeStart = timeRange === 'daily' ? startOfDay(now) :
                          timeRange === 'weekly' ? startOfWeek(now, { weekStartsOn: 1 }) :
                          timeRange === 'monthly' ? startOfMonth(now) :
                          new Date(now.getFullYear(), 0, 1);
        
        const rangeEnd = timeRange === 'daily' ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999) :
                        timeRange === 'weekly' ? endOfWeek(now, { weekStartsOn: 1 }) :
                        timeRange === 'monthly' ? endOfMonth(now) :
                        new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        const isCurrent = (dateStr: string | Date | undefined) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (timeRange === 'daily') return isSameDay(d, now);
            if (timeRange === 'weekly') return isSameWeek(d, now, { weekStartsOn: 1 });
            if (timeRange === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            return d.getFullYear() === now.getFullYear();
        };

        const prevStart = timeRange === 'daily' ? subDays(rangeStart, 1) :
                         timeRange === 'weekly' ? subWeeks(rangeStart, 1) :
                         timeRange === 'monthly' ? subMonths(rangeStart, 1) :
                         new Date(now.getFullYear() - 1, 0, 1);
        
        const prevEnd = timeRange === 'daily' ? new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate(), 23, 59, 59, 999) :
                       timeRange === 'weekly' ? endOfWeek(prevStart, { weekStartsOn: 1 }) :
                       timeRange === 'monthly' ? endOfMonth(prevStart) :
                       new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

        const isPrev = (dateStr: string | Date | undefined) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (timeRange === 'daily') return isSameDay(d, prevStart);
            if (timeRange === 'weekly') return isSameWeek(d, prevStart, { weekStartsOn: 1 });
            if (timeRange === 'monthly') {
                const prevMonth = subMonths(now, 1);
                return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
            }
            return d.getFullYear() === now.getFullYear() - 1;
        };

        const currentTasks = tasks.filter(t => {
            if (!t.completed || !t.completedAt) return false;
            const dateToUse = t.deadline ? t.deadline : t.completedAt;
            return isCurrent(dateToUse);
        });
        const prevTasks = tasks.filter(t => {
            if (!t.completed || !t.completedAt) return false;
            const dateToUse = t.deadline ? t.deadline : t.completedAt;
            return isPrev(dateToUse);
        });
        const curSessions = focusSessions.filter(s => isCurrent(s.timestamp));
        const preSessions = focusSessions.filter(s => isPrev(s.timestamp));

        const curFocusMins = curSessions.reduce((acc, s) => acc + s.duration, 0);
        const preFocusMins = preSessions.reduce((acc, s) => acc + s.duration, 0);

        const curMissed = tasks.filter(t => isActuallyMissed(t, rangeStart, rangeEnd)).length;
        const preMissed = tasks.filter(t => isActuallyMissed(t, prevStart, prevEnd)).length;

        const calcChange = (cur: number, pre: number) => {
            if (pre === 0) return cur > 0 ? 100 : 0;
            return Math.round(((cur - pre) / pre) * 100);
        };

        const calcScore = (comps: number, mins: number) => {
            if (comps === 0 && mins === 0) return 0;
            return Math.round(Math.min(100, (mins / 120 * 50) + (comps / 5 * 50)));
        };

        const curDenominator = tasks.filter(t => t.deadline && isCurrent(t.deadline)).length;
        const curNumerator = currentTasks.filter(t => t.deadline && isCurrent(t.deadline)).length;
        const curRate = curDenominator > 0 ? Math.round((curNumerator / curDenominator) * 100) : 0;

        const preDenominator = tasks.filter(t => t.deadline && isPrev(t.deadline)).length;
        const preNumerator = prevTasks.filter(t => t.deadline && isPrev(t.deadline)).length;
        const preRate = preDenominator > 0 ? Math.round((preNumerator / preDenominator) * 100) : 0;

        const hourlyStats = new Array(24).fill(0);
        curSessions.forEach(s => hourlyStats[new Date(s.timestamp).getHours()] += s.duration);
        const peakHIdx = hourlyStats.indexOf(Math.max(...hourlyStats));
        const peakH = peakHIdx >= 0 && Math.max(...hourlyStats) > 0 ? `${peakHIdx % 12 || 12}${peakHIdx < 12 ? 'AM' : 'PM'}` : '--';

        const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayStats = new Array(7).fill(0);
        curSessions.forEach(s => dayStats[new Date(s.timestamp).getDay()] += s.duration);
        const peakDIdx = dayStats.indexOf(Math.max(...dayStats));
        const peakD = Math.max(...dayStats) > 0 ? dayLabels[peakDIdx] : '--';

        return {
            tasksCompleted: currentTasks.length,
            tasksCompletedPrev: prevTasks.length,
            tasksCompletedChange: calcChange(currentTasks.length, prevTasks.length),
            tasksMissed: curMissed,
            tasksMissedPrev: preMissed,
            tasksMissedChange: calcChange(curMissed, preMissed),
            focusMinutes: curFocusMins,
            focusMinutesPrev: preFocusMins,
            focusChange: calcChange(curFocusMins, preFocusMins),
            productivityScore: calcScore(currentTasks.length, curFocusMins),
            productivityScorePrev: calcScore(prevTasks.length, preFocusMins),
            productivityScoreChange: calcChange(calcScore(currentTasks.length, curFocusMins), calcScore(prevTasks.length, preFocusMins)),
            completionRate: curRate,
            completionRateChange: calcChange(curRate, preRate),
            avgSessionLength: curSessions.length > 0 ? Math.round(curFocusMins / curSessions.length) : 0,
            avgSessionLengthPrev: preSessions.length > 0 ? Math.round(preFocusMins / preSessions.length) : 0,
            avgSessionLengthChange: calcChange(curSessions.length > 0 ? curFocusMins / curSessions.length : 0, preSessions.length > 0 ? preFocusMins / preSessions.length : 0),
            mostProductiveDay: peakD,
            mostProductiveHour: peakH,
        };
    }, [tasks, focusSessions, timeRange, viewDate, isActuallyMissed]);

    const focusData = useMemo(() => {
        const current = aggregateData(timeRange);
        
        let prevDate: Date;
        if (timeRange === 'daily') prevDate = subDays(viewDate, 1);
        else if (timeRange === 'weekly') prevDate = subWeeks(viewDate, 1);
        else if (timeRange === 'monthly') prevDate = subMonths(viewDate, 1);
        else prevDate = new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), viewDate.getDate());

        const prev = aggregateData(timeRange, prevDate);
        
        return current.map((d, i) => ({
            ...d,
            prev: prev[i]?.focus || 0
        }));
    }, [timeRange, aggregateData, viewDate]);

    const taskData = useMemo(() => aggregateData(timeRange), [timeRange, aggregateData]);
    const hourlyData = useMemo(() => aggregateData('daily'), [aggregateData]);

    const categoryData = useMemo(() => {
        const checkRange = (dateStr: string | undefined) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (timeRange === 'daily') return isSameDay(d, viewDate);
            if (timeRange === 'weekly') return isSameWeek(d, viewDate, { weekStartsOn: 1 });
            if (timeRange === 'monthly') return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
            return d.getFullYear() === viewDate.getFullYear();
        };

        const rangeTasks = tasks.filter(t => t.completed && t.completedAt && checkRange(t.completedAt));
        const counts: Record<string, number> = {};
        rangeTasks.forEach(t => {
            const tag = t.tags[0] || 'General';
            counts[tag] = (counts[tag] || 0) + 1;
        });
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total === 0) return [];

        return Object.entries(counts).map(([name, count], i) => ({
            name,
            value: Math.round((count / total) * 100),
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
        })).sort((a, b) => b.value - a.value);
    }, [tasks, viewDate, timeRange]);



    // ── Time Range Switch ──────────────────────────────────────────────────
    const handleTimeRangeChange = useCallback((range: TimeRange) => {
        setIsLoading(true);
        setTimeout(() => {
            setTimeRange(range);
            setIsLoading(false);
        }, 300);
    }, []);

    // ── Export Helpers ─────────────────────────────────────────────────────
    const exportCSV = useCallback(() => {
        const rows = [
            ['Date', 'Focus Minutes', 'Tasks Completed', 'Tasks Missed'],
            ...focusData.map((d, i) => [d.label, d.focus, taskData[i]?.completed ?? 0, taskData[i]?.missed ?? 0]),
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `essential-insights-${timeRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [focusData, taskData, timeRange]);

    const exportPDF = useCallback(() => {
        window.print();
    }, []);

    // ── Chart Renderer ─────────────────────────────────────────────────────
    const renderFocusChart = () => {
        const commonProps = {
            data: focusData,
            margin: { top: 5, right: 10, left: -10, bottom: 0 },
        };
        const xAxis = <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />;
        const yAxis = <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />;
        const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />;
        const tooltip = <Tooltip content={<CustomTooltip />} />;
        const legend = <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />;

        if (focusChartType === 'bar') return (
            <BarChart {...commonProps}>
                {grid}{xAxis}{yAxis}{tooltip}{legend}
                <Bar dataKey="focus" name="This Period" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} unit="m" />
                <Bar dataKey="prev" name="Previous" fill="rgba(99,102,241,0.25)" radius={[4, 4, 0, 0]} unit="m" />
            </BarChart>
        );
        if (focusChartType === 'line') return (
            <LineChart {...commonProps}>
                {grid}{xAxis}{yAxis}{tooltip}{legend}
                <Line type="monotone" dataKey="focus" name="This Period" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={false} unit="m" />
                <Line type="monotone" dataKey="prev" name="Previous" stroke="rgba(99,102,241,0.4)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} unit="m" />
            </LineChart>
        );
        return (
            <AreaChart {...commonProps}>
                <defs>
                    <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                    </linearGradient>
                </defs>
                {grid}{xAxis}{yAxis}{tooltip}{legend}
                <Area type="monotone" dataKey="focus" name="This Period" stroke={CHART_COLORS.primary} fill="url(#focusGrad)" strokeWidth={2.5} unit="m" animationDuration={400} />
                <Area type="monotone" dataKey="prev" name="Previous" stroke={CHART_COLORS.secondary} fill="url(#prevGrad)" strokeWidth={1.5} strokeDasharray="4 4" unit="m" animationDuration={400} />
            </AreaChart>
        );
    };

    const renderTaskChart = () => {
        const commonProps = {
            data: taskData,
            margin: { top: 5, right: 10, left: -10, bottom: 0 },
        };
        const xAxis = <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />;
        const yAxis = <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />;
        const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />;
        const tooltip = <Tooltip content={<CustomTooltip />} />;
        const legend = <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />;

        if (taskChartType === 'line') return (
            <LineChart {...commonProps}>
                {grid}{xAxis}{yAxis}{tooltip}{legend}
                <Line type="monotone" dataKey="completed" name="Completed" stroke={CHART_COLORS.success} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="missed" name="Missed" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} strokeDasharray="4 4" />
            </LineChart>
        );
        if (taskChartType === 'area') return (
            <AreaChart {...commonProps}>
                <defs>
                    <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                    </linearGradient>
                </defs>
                {grid}{xAxis}{yAxis}{tooltip}{legend}
                <Area type="monotone" dataKey="completed" name="Completed" stroke={CHART_COLORS.success} fill="url(#compGrad)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="missed" name="Missed" stroke={CHART_COLORS.danger} fill="rgba(239,68,68,0.05)" strokeWidth={2} strokeDasharray="4 4" />
            </AreaChart>
        );
        return (
            <BarChart {...commonProps}>
                {grid}{xAxis}{yAxis}{tooltip}{legend}
                <Bar dataKey="completed" name="Completed" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} stackId="tasks" animationDuration={400} />
                <Bar dataKey="missed" name="Missed" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} stackId="tasks" animationDuration={400} />
            </BarChart>
        );
    };

    const renderDistributionChart = () => {
        if (distChartType === 'radial') return (
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={categoryData} startAngle={180} endAngle={-180}>
                <RadialBar dataKey="value" background={{ fill: 'var(--bg-hover)' }} cornerRadius={4} label={{ position: 'insideStart', fill: 'var(--text-primary)', fontSize: 11 }}>
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </RadialBar>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </RadialBarChart>
        );
        return (
            <PieChart>
                <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={distChartType === 'donut' ? '55%' : 0}
                    outerRadius="80%"
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={distChartType === 'donut' ? 3 : 0}
                    strokeWidth={0}
                >
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
        );
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    if (!mounted) return null;

    return (
        <div className={styles.page}>
            {/* Header */}
            <motion.div className={styles.header} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}>
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <h1 className={styles.title}>Dynamic Insights</h1>
                        <div className={styles.datePickerContainer}>
                            <input 
                                type="date" 
                                className={styles.dateInput}
                                value={format(viewDate, 'yyyy-MM-dd')}
                                onChange={(e) => {
                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                    // Always set to start of day for consistency, logic will handle "effectiveEnd"
                                    setViewDate(new Date(y, m - 1, d, 0, 0, 0));
                                }}
                            />
                            <p className={styles.subtitle}>
                                Analysis for period ending {format(viewDate, 'MMM do, yyyy')}
                            </p>
                        </div>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <button className={styles.filterToggle} onClick={() => setShowFilters(v => !v)}>
                        <Filter size={15} />
                        <span>Filters</span>
                        <ChevronDown size={13} className={clsx(styles.chevron, showFilters && styles.open)} />
                    </button>
                    <button className={styles.exportBtn} onClick={exportCSV} title="Export CSV">
                        <FileSpreadsheet size={15} />
                        <span>CSV</span>
                    </button>
                    <button className={styles.exportBtn} onClick={exportPDF} title="Export PDF">
                        <FileText size={15} />
                        <span>PDF</span>
                    </button>
                </div>
            </motion.div>

            {/* Filter Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        className={styles.filterPanel}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className={styles.filterGroup}>
                            <span className={styles.filterLabel}>Category</span>
                            {(['all', 'work', 'study', 'health', 'personal'] as FilterCategory[]).map(c => (
                                <button key={c} className={clsx(styles.filterChip, filterCategory === c && styles.active)} onClick={() => setFilterCategory(c)}>
                                    {c.charAt(0).toUpperCase() + c.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className={styles.filterGroup}>
                            <span className={styles.filterLabel}>Priority</span>
                            {(['all', 'low', 'medium', 'high', 'critical'] as FilterPriority[]).map(p => (
                                <button key={p} className={clsx(styles.filterChip, filterPriority === p && styles.active)} onClick={() => setFilterPriority(p)}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Time Range Selector */}
            <motion.div className={styles.timeRangeBar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                {[
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                    { id: 'yearly', label: 'Yearly' }
                ].map(r => (
                    <button
                        key={r.id}
                        className={clsx(styles.timeRangeBtn, timeRange === r.id && styles.active)}
                        onClick={() => handleTimeRangeChange(r.id as TimeRange)}
                    >
                        {r.label}
                    </button>
                ))}
            </motion.div>

            {/* ── Summary Metric Cards ───────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={timeRange}
                    className={styles.metricsGrid}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                >
                    <MetricCard
                        icon={<CheckCircle2 size={18} />}
                        label="Tasks Completed"
                        value={metrics.tasksCompleted}
                        change={metrics.tasksCompletedChange}
                        color="var(--status-success)"
                        timeRange={timeRange}
                    />
                    <MetricCard
                        icon={<XCircle size={18} />}
                        label="Tasks Missed"
                        value={metrics.tasksMissed}
                        change={metrics.tasksMissedChange}
                        color="var(--status-danger)"
                        timeRange={timeRange}
                        invertTrend
                    />
                    <MetricCard
                        icon={<Clock size={18} />}
                        label="Focus Minutes"
                        value={metrics.focusMinutes}
                        suffix="m"
                        change={metrics.focusChange}
                        color="var(--accent-primary)"
                        timeRange={timeRange}
                    />
                    <MetricCard
                        icon={<Zap size={18} />}
                        label="Productivity Score"
                        value={metrics.productivityScore}
                        suffix="%"
                        change={metrics.productivityScoreChange}
                        color="var(--status-warning)"
                        timeRange={timeRange}
                    />
                    <MetricCard
                        icon={<Target size={18} />}
                        label="Completion Rate"
                        value={metrics.completionRate}
                        suffix="%"
                        change={metrics.completionRateChange}
                        color="var(--status-info)"
                        timeRange={timeRange}
                    />
                    <MetricCard
                        icon={<Award size={18} />}
                        label="Avg Session"
                        value={metrics.avgSessionLength}
                        suffix="m"
                        change={metrics.avgSessionLengthChange}
                        color="var(--accent-secondary)"
                        timeRange={timeRange}
                    />
                    <MetricCard
                        icon={<Calendar size={18} />}
                        label="Best Day"
                        value={metrics.mostProductiveDay}
                        color="var(--status-success)"
                        timeRange={timeRange}
                        isText
                    />
                    <MetricCard
                        icon={<Sun size={18} />}
                        label="Peak Hour"
                        value={metrics.mostProductiveHour}
                        color="var(--status-warning)"
                        timeRange={timeRange}
                        isText
                    />
                </motion.div>
            </AnimatePresence>

            {/* ── Charts Row 1: Focus + Tasks ───────────────────────────────── */}
            <div className={styles.chartsRow}>
                {/* Focus Time Chart */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`focus-${timeRange}`}
                        className={styles.chartCard}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className={styles.chartHeader}>
                            <div className={styles.chartTitleGroup}>
                                <Clock size={16} className={styles.chartIcon} />
                                <div>
                                    <h3 className={styles.chartTitle}>Focus Time Analytics</h3>
                                    <p className={styles.chartSub}>Minutes spent in deep focus</p>
                                </div>
                            </div>
                            <ChartTypePicker value={focusChartType} onChange={setFocusChartType} types={['area', 'bar', 'line']} />
                        </div>
                        {isLoading ? (
                            <div className={styles.chartSkeleton}><div className={styles.skeletonShimmer} /></div>
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${focusChartType}-${timeRange}`}
                                    className={styles.chartContainer}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <ResponsiveContainer width="100%" height={240}>
                                        {renderFocusChart()}
                                    </ResponsiveContainer>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Task Completion Chart */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`tasks-${timeRange}`}
                        className={styles.chartCard}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 }}
                    >
                        <div className={styles.chartHeader}>
                            <div className={styles.chartTitleGroup}>
                                <CheckCircle2 size={16} className={styles.chartIcon} />
                                <div>
                                    <h3 className={styles.chartTitle}>Task Completion</h3>
                                    <p className={styles.chartSub}>Completed vs missed over time</p>
                                </div>
                            </div>
                            <ChartTypePicker value={taskChartType} onChange={setTaskChartType} types={['bar', 'line', 'area']} />
                        </div>
                        {isLoading ? (
                            <div className={styles.chartSkeleton}><div className={styles.skeletonShimmer} /></div>
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${taskChartType}-${timeRange}`}
                                    className={styles.chartContainer}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <ResponsiveContainer width="100%" height={240}>
                                        {renderTaskChart()}
                                    </ResponsiveContainer>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── Charts Row 2: Distribution + Hourly Timeline ──────────────── */}
            <div className={styles.chartsRow}>
                {/* Category Distribution */}
                <motion.div
                    className={clsx(styles.chartCard, styles.chartCardSmall)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <div className={styles.chartHeader}>
                        <div className={styles.chartTitleGroup}>
                            <Activity size={16} className={styles.chartIcon} />
                            <div>
                                <h3 className={styles.chartTitle}>Category Distribution</h3>
                                <p className={styles.chartSub}>Time split by category</p>
                            </div>
                        </div>
                        <DistChartPicker value={distChartType} onChange={setDistChartType} />
                    </div>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={240}>
                            {renderDistributionChart() as React.ReactElement}
                        </ResponsiveContainer>
                    </div>
                    {/* Category legend list */}
                    <div className={styles.categoryList}>
                        {categoryData.length > 0 ? (
                            categoryData.map(cat => (
                                <div key={cat.name} className={styles.categoryRow}>
                                    <span className={styles.categoryDot} style={{ background: cat.color }} />
                                    <span className={styles.categoryName}>{cat.name}</span>
                                    <div className={styles.categoryBar}>
                                        <motion.div
                                            className={styles.categoryFill}
                                            style={{ background: cat.color }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${cat.value}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                        />
                                    </div>
                                    <span className={styles.categoryPct}>{cat.value}%</span>
                                </div>
                            ))
                        ) : (
                            <div className={styles.empty}>No category data. Tag your tasks to see distribution.</div>
                        )}
                    </div>
                </motion.div>

                {/* Hourly Productivity Timeline */}
                <motion.div
                    className={clsx(styles.chartCard, styles.chartCardWide)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className={styles.chartHeader}>
                        <div className={styles.chartTitleGroup}>
                            <Activity size={16} className={styles.chartIcon} />
                            <div>
                                <h3 className={styles.chartTitle}>Productivity Timeline</h3>
                                <p className={styles.chartSub}>Hourly productivity patterns</p>
                            </div>
                        </div>
                        <div className={styles.peakBadge}>
                            <Zap size={12} />
                            <span>Peak: {metrics.mostProductiveHour}</span>
                        </div>
                    </div>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={hourlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="productivity" name="Productivity" stroke="#f59e0b" fill="url(#hourGrad)" strokeWidth={2.5} unit="%" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Heatmap row */}
                    <div className={styles.heatmapRow}>
                        {hourlyData.map((d, i) => (
                            <div
                                key={i}
                                className={styles.heatCell}
                                style={{ opacity: 0.15 + (d.productivity / 100) * 0.85, background: d.productivity > 70 ? '#f59e0b' : d.productivity > 40 ? '#6366f1' : '#3b82f6' }}
                                title={`${d.hour}: ${d.productivity}%`}
                            />
                        ))}
                    </div>
                    <div className={styles.heatmapLegend}>
                        <span className={styles.heatmapLabel}>Low</span>
                        <div className={styles.heatmapGradient} />
                        <span className={styles.heatmapLabel}>High</span>
                    </div>
                </motion.div>
            </div>

            {/* ── Trend Comparison Strip ────────────────────────────────────── */}
            <motion.div
                className={styles.trendStrip}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <div className={styles.trendStripTitle}>
                    <TrendingUp size={16} />
                    <span>Historical Variance</span>
                </div>
                <div className={styles.trendCards}>
                    <TrendCompareCard label="Focus Time" current={metrics.focusMinutes} prev={metrics.focusMinutesPrev} unit="m" color={CHART_COLORS.primary} />
                    <TrendCompareCard label="Tasks Done" current={metrics.tasksCompleted} prev={metrics.tasksCompletedPrev} unit="" color={CHART_COLORS.success} />
                    <TrendCompareCard label="P. Score" current={metrics.productivityScore} prev={metrics.productivityScorePrev} unit="%" color={CHART_COLORS.warning} />
                    <TrendCompareCard label="Avg Session" current={metrics.avgSessionLength} prev={metrics.avgSessionLengthPrev} unit="m" color={CHART_COLORS.info} />
                </div>
            </motion.div>


            {/* ── AI Productivity Coach Section ──────────────────────────────── */}
            <AICoach viewDate={viewDate} timeRange={timeRange} />


        </div>
    );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    suffix?: string;
    change?: number;
    color: string;
    timeRange: TimeRange;
    invertTrend?: boolean;
    isText?: boolean;
}

function MetricCard({ icon, label, value, suffix = '', change, color, timeRange, invertTrend, isText }: MetricCardProps) {
    const trendUp = invertTrend ? (change ?? 0) < 0 : (change ?? 0) >= 0;
    const isNeutral = change === 0 || change === undefined;
    const periodLabel = timeRange === 'daily' ? 'yesterday' : timeRange === 'weekly' ? 'last week' : 'last month';

    return (
        <motion.div
            className={styles.metricCard}
            whileHover={{ y: -3, borderColor: color }}
            style={{ '--card-accent': color } as React.CSSProperties}
        >
            <div className={styles.metricTop}>
                <div className={styles.metricIcon} style={{ background: `${color}18`, color }}>
                    {icon}
                </div>
                {change !== undefined && !isNeutral && (
                    <div className={clsx(styles.trendBadge, trendUp ? styles.trendUp : styles.trendDown)}>
                        {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        <span>{Math.abs(change)}%</span>
                    </div>
                )}
                {isNeutral && <div className={styles.trendBadge}><Minus size={12} /><span>0%</span></div>}
            </div>
            <div className={styles.metricValue} style={{ color }}>
                {isText ? value : <>{value}<span className={styles.metricSuffix}>{suffix}</span></>}
            </div>
            <div className={styles.metricLabel}>{label}</div>
            {change !== undefined && (
                <div className={styles.metricCompare}>
                    vs {periodLabel}
                </div>
            )}
        </motion.div>
    );
}

interface ChartTypePickerProps {
    value: ChartType;
    onChange: (t: ChartType) => void;
    types: ChartType[];
}

const chartTypeIcons: Record<ChartType, string> = { bar: '▬', line: '〜', area: '◢' };
function ChartTypePicker({ value, onChange, types }: ChartTypePickerProps) {
    return (
        <div className={styles.chartTypePicker}>
            {types.map(t => (
                <button
                    key={t}
                    className={clsx(styles.chartTypeBtn, value === t && styles.active)}
                    onClick={() => onChange(t)}
                    title={`${t} chart`}
                >
                    {chartTypeIcons[t]}
                </button>
            ))}
        </div>
    );
}

interface DistChartPickerProps { value: DistributionChart; onChange: (t: DistributionChart) => void; }
function DistChartPicker({ value, onChange }: DistChartPickerProps) {
    const types: { id: DistributionChart; label: string }[] = [
        { id: 'donut', label: '◎' },
        { id: 'pie', label: '◕' },
        { id: 'radial', label: '◉' },
    ];
    return (
        <div className={styles.chartTypePicker}>
            {types.map(t => (
                <button key={t.id} className={clsx(styles.chartTypeBtn, value === t.id && styles.active)} onClick={() => onChange(t.id)} title={`${t.id} chart`}>
                    {t.label}
                </button>
            ))}
        </div>
    );
}

interface TrendCompareCardProps {
    label: string;
    current: number;
    prev: number;
    unit: string;
    color: string;
    invertGood?: boolean;
}
function TrendCompareCard({ label, current, prev, unit, color, invertGood }: TrendCompareCardProps) {
    const diff = current - prev;
    const pct = prev > 0 ? Math.round(Math.abs(diff / prev) * 100) : 0;
    const isGood = invertGood ? diff <= 0 : diff >= 0;
    const barPct = Math.min(100, (current / Math.max(current, prev)) * 100);
    const prevBarPct = Math.min(100, (prev / Math.max(current, prev)) * 100);

    return (
        <div className={styles.trendCard}>
            <div className={styles.trendCardHeader}>
                <span className={styles.trendCardLabel}>{label}</span>
                <span className={clsx(styles.trendDiff, isGood ? styles.trendGood : styles.trendBad)}>
                    {diff > 0 ? '+' : ''}{diff}{unit} ({pct}%)
                </span>
            </div>
            <div className={styles.trendBars}>
                <div className={styles.trendBarGroup}>
                    <span className={styles.trendBarLabel}>Now</span>
                    <div className={styles.trendBarTrack}>
                        <motion.div className={styles.trendBarFill} style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <span className={styles.trendBarValue}>{current}{unit}</span>
                </div>
                <div className={styles.trendBarGroup}>
                    <span className={styles.trendBarLabel}>Prev</span>
                    <div className={styles.trendBarTrack}>
                        <motion.div className={styles.trendBarFill} style={{ background: `${color}50` }} initial={{ width: 0 }} animate={{ width: `${prevBarPct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <span className={styles.trendBarValue}>{prev}{unit}</span>
                </div>
            </div>
        </div>
    );
}
