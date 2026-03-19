"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Flame,
    Plus,
    CheckCircle2,
    MoreVertical,
    TrendingUp,
    Award,
    Zap,
    X,
    Trash2,
    Target
} from 'lucide-react';
import { useTaskStore, Habit, getLocalDateStr } from '@/store/useTaskStore';
import { Button } from '@/components/ui/UIComponents';
import styles from './Habits.module.css';
import { clsx } from 'clsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { useTheme } from 'next-themes';

// Helper: Generates a full month calendar with completion status for a specific date
const generateMonthCalendar = (viewDate: Date, completedDates: string[] = []) => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start, end });
    
    const startDayOfWeek = getDay(start); 
    const calendarDays: ({ date: Date; isStreakDay: boolean; isToday: boolean; dateStr: string; isFuture: boolean } | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
        calendarDays.push(null);
    }
    
    const datesSet = new Set(completedDates);
    const todayStr = getLocalDateStr();
    
    days.forEach(date => {
        const dateStr = getLocalDateStr(date);
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;
        
        calendarDays.push({
            date,
            isStreakDay: datesSet.has(dateStr),
            isToday,
            dateStr,
            isFuture
        });
    });
    
    return { calendarDays, monthName: format(viewDate, 'MMMM yyyy') };
};

export default function HabitsPage() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const { habits, toggleHabit, deleteHabit, addHabit } = useTaskStore();
    
    const [viewDate, setViewDate] = useState(new Date());
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newHabitTitle, setNewHabitTitle] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const bestStreak = useMemo(() => Math.max(0, ...habits.map(h => h.streak)), [habits]);
    const overallConsistency = useMemo(() => {
        if (habits.length === 0) return 0;
        const totalStreaks = habits.reduce((acc, h) => acc + Math.min(h.streak, 30), 0);
        return Math.min(100, Math.round((totalStreaks / (habits.length * 30)) * 100));
    }, [habits]);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHabitTitle.trim()) return;
        addHabit(newHabitTitle.trim());
        setNewHabitTitle('');
        setIsAddModalOpen(false);
    };

    if (!mounted) return null;

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setActiveMenu(null)} // Close menus when clicking outside
        >
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1 className="text-gradient">Daily Habits</h1>
                    <p className={styles.subtitle}>Build consistency, unlock potential.</p>
                </div>

                <div className={styles.stats}>
                    <div className={styles.overviewCard}>
                        <Award className={styles.statIcon} style={{ color: 'var(--status-warning)' }} />
                        <div>
                            <div className={styles.statVal}>{bestStreak}</div>
                            <div className={styles.statLabel}>Best Streak</div>
                        </div>
                    </div>
                    <div className={styles.overviewCard}>
                        <TrendingUp className={styles.statIcon} style={{ color: 'var(--status-success)' }} />
                        <div>
                            <div className={styles.statVal}>{overallConsistency}%</div>
                            <div className={styles.statLabel}>Consistency</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className={styles.ritualGrid}>
                {habits.map((habit, index) => {
                    const { calendarDays, monthName } = generateMonthCalendar(viewDate, habit.completedDates);
                    
                    return (
                        <motion.div 
                            key={habit.id}
                            className={clsx(
                                'glass-surface', 
                                styles.habitCard,
                                mounted && theme === 'oceanic' && `theme-pastel-${(index % 4) + 1}`
                            )}
                            layout
                            whileHover={{ y: -5 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <div className={styles.habitHeader}>
                                <div className={styles.habitInfo}>
                                    <div className={styles.habitIcon}>
                                        <Target size={20} />
                                    </div>
                                    <div>
                                        <h3 className={styles.habitTitle}>{habit.title}</h3>
                                        <div className={styles.streakInfo}>
                                            <Flame size={14} className={styles.flameIcon} />
                                            <span>{habit.streak} day streak</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.habitActions}>
                                    <button 
                                        className={styles.moreBtn} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === habit.id ? null : habit.id);
                                        }}
                                        title="Menu"
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                    
                                    <AnimatePresence>
                                        {activeMenu === habit.id && (
                                            <motion.div 
                                                className={styles.dropdown}
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <button 
                                                    className={styles.dropdownDanger}
                                                    onClick={() => {
                                                        deleteHabit(habit.id);
                                                        setActiveMenu(null);
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                    Discard Habit
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Monthly Calendar */}
                            <div className={styles.calendarWrapper}>
                                <div className={styles.calendarHeader}>
                                    <span className={styles.monthLabel}>{monthName.toUpperCase()}</span>
                                    <div className={styles.calendarNav}>
                                        <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className={styles.navBtn}>←</button>
                                        <button onClick={() => setViewDate(new Date())} className={styles.navBtn}>T</button>
                                        <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className={styles.navBtn}>→</button>
                                    </div>
                                </div>
                                <div className={styles.calendarGrid}>
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                                        <div key={`head-${idx}`} className={styles.weekday}>{d}</div>
                                    ))}
                                    {calendarDays.map((dayObj, idx) => {
                                        if (!dayObj) return <div key={`empty-${idx}`} className={styles.emptyDay} />;
                                        return (
                                            <motion.button 
                                                key={dayObj.dateStr}
                                                whileHover={!dayObj.isFuture ? { scale: 1.15 } : {}}
                                                whileTap={!dayObj.isFuture ? { scale: 0.9 } : {}}
                                                onClick={() => !dayObj.isFuture && toggleHabit(habit.id, dayObj.dateStr)}
                                                disabled={dayObj.isFuture}
                                                className={clsx(
                                                    styles.dayCell, 
                                                    dayObj.isStreakDay && styles.streakDay,
                                                    dayObj.isToday && styles.todayCell,
                                                    !dayObj.isFuture && styles.clickableDay,
                                                    dayObj.isFuture && styles.futureDay
                                                )}
                                                title={dayObj.isFuture ? 'Future Date' : `${dayObj.isStreakDay ? 'Marked' : 'Unmarked'} on ${format(dayObj.date, 'MMM d')}`}
                                            >
                                                {format(dayObj.date, 'd')}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            <Button
                                fullWidth
                                variant={habit.completedToday ? 'ghost' : 'primary'}
                                onClick={() => toggleHabit(habit.id)}
                                className={styles.completeBtn}
                            >
                                {habit.completedToday ? (
                                    <><CheckCircle2 size={18} /> Habit Complete</>
                                ) : (
                                    'Mark Complete'
                                )}
                            </Button>
                        </motion.div>
                    );
                })}

                <button className={styles.addHabitCard} onClick={() => setIsAddModalOpen(true)}>
                    <div className={styles.addIcon}>
                        <Plus size={32} />
                    </div>
                    <span>Create New Habit</span>
                </button>
            </div>

            {/* Create Habit Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className={styles.modalOverlay}>
                        <motion.div 
                            className={styles.modalContent}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        >
                            <button className={styles.closeBtn} onClick={() => setIsAddModalOpen(false)}>
                                <X size={20} />
                            </button>
                            
                            <h2 className={styles.modalTitle}>New Daily Habit</h2>
                            <p className={styles.modalSubtitle}>What consistent action will step you closer to your goals?</p>
                            
                            <form onSubmit={handleAddSubmit} className={styles.modalForm}>
                                <div className={styles.inputGroup}>
                                    <label>Habit Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Read 20 pages, Meditate, Drink water..." 
                                        value={newHabitTitle}
                                        onChange={(e) => setNewHabitTitle(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <Button type="submit" variant="primary" fullWidth className={styles.modalSubmit}>
                                    Forge Habit
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
