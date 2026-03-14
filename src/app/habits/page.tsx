"use client";

import React, { useState, useMemo } from 'react';
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
import { useTaskStore, Habit } from '@/store/useTaskStore';
import { Button } from '@/components/ui/UIComponents';
import styles from './Habits.module.css';
import { clsx } from 'clsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

// Helper: Generates a pseudo-random heatmap pattern consistent with the habit ID
const generateMonthCalendar = (streak: number, completedToday: boolean) => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    const days = eachDayOfInterval({ start, end });
    
    const startDayOfWeek = getDay(start); 
    const calendarDays: ({ date: Date; isStreakDay: boolean; isToday: boolean } | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
        calendarDays.push(null);
    }
    
    days.forEach(date => {
        const todayAtMidnight = new Date(today);
        todayAtMidnight.setHours(0, 0, 0, 0);
        const dateAtMidnight = new Date(date);
        dateAtMidnight.setHours(0, 0, 0, 0);
        
        const diffTime = todayAtMidnight.getTime() - dateAtMidnight.getTime();
        const daysAgo = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        let isStreakDay = false;
        if (daysAgo === 0) {
            isStreakDay = completedToday;
        } else if (daysAgo > 0) {
            isStreakDay = completedToday ? daysAgo < streak : daysAgo <= streak && streak > 0;
        }
        
        calendarDays.push({
            date,
            isStreakDay,
            isToday: daysAgo === 0
        });
    });
    
    return { calendarDays, monthName: format(today, 'MMMM yyyy') };
};

export default function HabitsPage() {
    const { habits, toggleHabit, deleteHabit, addHabit } = useTaskStore();
    
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

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setActiveMenu(null)} // Close menus when clicking outside
        >
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1 className="text-gradient">Daily Rituals</h1>
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
                {habits.map((habit) => {
                    const { calendarDays, monthName } = generateMonthCalendar(habit.streak, habit.completedToday);

                    return (
                        <motion.div
                            key={habit.id}
                            className={clsx('glass-surface', styles.habitCard)}
                            whileHover={{ y: -5 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <div className={styles.habitHeader}>
                                <div className={styles.habitIcon}>
                                    <Target size={20} />
                                </div>
                                <div className={styles.habitInfo}>
                                    <h3>{habit.title}</h3>
                                    <div className={styles.streakInfo}>
                                        <Flame size={14} className={styles.flameIcon} />
                                        <span>{habit.streak} day streak</span>
                                    </div>
                                </div>
                                
                                {/* Context Menu */}
                                <div className={styles.menuContainer}>
                                    <button 
                                        className={styles.moreBtn} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === habit.id ? null : habit.id);
                                        }}
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
                                                    Discard Ritual
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Monthly Calendar */}
                            <div className={styles.calendarWrapper}>
                                <div className={styles.calendarHeader}>{monthName.toUpperCase()}</div>
                                <div className={styles.calendarGrid}>
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                                        <div key={`head-${idx}`} className={styles.weekday}>{d}</div>
                                    ))}
                                    {calendarDays.map((dayObj, idx) => {
                                        if (!dayObj) return <div key={`empty-${idx}`} className={styles.emptyDay} />;
                                        return (
                                            <div 
                                                key={dayObj.date.toISOString()}
                                                className={clsx(
                                                    styles.dayCell, 
                                                    dayObj.isStreakDay && styles.streakDay,
                                                    dayObj.isToday && styles.todayCell
                                                )}
                                            >
                                                {format(dayObj.date, 'd')}
                                            </div>
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
                                    <><CheckCircle2 size={18} /> Ritual Complete</>
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
                    <span>Create New Ritual</span>
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
                            
                            <h2 className={styles.modalTitle}>New Daily Ritual</h2>
                            <p className={styles.modalSubtitle}>What consistent action will step you closer to your goals?</p>
                            
                            <form onSubmit={handleAddSubmit} className={styles.modalForm}>
                                <div className={styles.inputGroup}>
                                    <label>Ritual Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Read 20 pages, Meditate, Drink water..." 
                                        value={newHabitTitle}
                                        onChange={(e) => setNewHabitTitle(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <Button type="submit" variant="primary" fullWidth className={styles.modalSubmit}>
                                    Forge Ritual
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
