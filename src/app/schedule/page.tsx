"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    format,
    startOfWeek,
    addDays,
    startOfMonth,
    endOfMonth,
    endOfWeek,
    isSameDay,
    addMonths,
    subMonths,
    eachDayOfInterval,
    isSameMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import styles from './Schedule.module.css';
import { clsx } from 'clsx';
import { TaskModal } from '@/components/tasks/TaskModal';

export default function SchedulePage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // We get tasks to show dots on calendar
    const tasks = useTaskStore((state) => state.tasks);
    const activities = useTaskStore((state) => state.activities);

    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const days = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentDate]);

    const getTasksForDay = (day: Date) => {
        return tasks.filter(task => task.deadline && isSameDay(new Date(task.deadline), day));
    };

    const selectedDayTasks = selectedDate ? getTasksForDay(selectedDate) : [];
    const dayActivities = selectedDate ? activities.filter(a => isSameDay(new Date(a.timestamp), selectedDate)).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];

    // Format type label
    const formatActivityType = (type: string) => {
        return type.split('_').join(' ');
    };

    return (
        <div className={styles.container}>
            <div className={styles.mainLayout}>
                {/* Left Panel: Calendar */}
                <motion.div 
                    className={styles.calendarPanel}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <header className={styles.calHeader}>
                        <div className={styles.calHeaderLeft}>
                            <h2>{format(currentDate, 'MMMM')} <span>{format(currentDate, 'yyyy')}</span></h2>
                            <div className={styles.navBtns}>
                                <button onClick={prevMonth} className={styles.iconBtn}><ChevronLeft size={16} /></button>
                                <button onClick={nextMonth} className={styles.iconBtn}><ChevronRight size={16} /></button>
                            </div>
                        </div>

                        <div className={styles.calHeaderRight}>
                            <span className={styles.monthlyTasksLabel}>Monthly tasks</span>
                            <span className={styles.monthlyTasksValue}>98%</span>
                        </div>
                    </header>

                    <div className={styles.calendarGrid}>
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                            <div key={day} className={styles.dayHeader}>{day}</div>
                        ))}

                        {days.map((day, idx) => {
                            const dayTasks = getTasksForDay(day);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const currentMonth = isSameMonth(day, currentDate);

                            // Collect up to 3 priority colors for the dots
                            const dots = dayTasks.slice(0, 3).map(t => `var(--status-${t.priority})`);

                            return (
                                <motion.div
                                    key={day.toISOString()}
                                    className={clsx(
                                        styles.dayCell,
                                        !currentMonth && styles.otherMonth,
                                        currentMonth && styles.currentMonth,
                                        isSelected && styles.selectedDay
                                    )}
                                    onClick={() => setSelectedDate(day)}
                                    onDoubleClick={() => {
                                        setSelectedDate(day);
                                        setIsModalOpen(true);
                                    }}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.01 }}
                                >
                                    <div className={styles.dayNumber}>{format(day, 'd')}</div>
                                    {dots.length > 0 && (
                                        <div className={styles.taskDots}>
                                            {dots.map((color, i) => (
                                                <div key={i} className={styles.dot} style={{ background: color }} />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Right Panel: Side Tab */}
                <AnimatePresence mode="wait">
                    {selectedDate && (
                        <motion.div 
                            className={styles.sidePanel}
                            key={selectedDate.toISOString()}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <div className={styles.activitySection}>
                                <div className={styles.sectionHeader}>
                                    <h3>Activity</h3>
                                </div>
                                <div className={styles.timelineList}>
                                    {dayActivities.length > 0 ? (
                                        dayActivities.map(activity => (
                                            <div key={activity.id} className={styles.timelineItem}>
                                                <div className={styles.timelineTime}>
                                                    {format(new Date(activity.timestamp), 'hh:mm a')}
                                                </div>
                                                <div className={styles.timelineContent}>
                                                    <div className={styles.timelineTitle}>{activity.title}</div>
                                                    <div className={clsx(styles.timelineType, styles[activity.type])}>
                                                        {formatActivityType(activity.type)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.noReminders}>
                                            No activity recorded for {format(selectedDate, 'MMM do')}.
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className={styles.remindersSection}>
                                <div className={styles.sectionHeader}>
                                    <h3>Reminders</h3>
                                    <button 
                                        className={styles.addMiniBtn} 
                                        onClick={() => setIsModalOpen(true)}
                                        title="Schedule Task"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <div className={styles.remindersList}>
                                    {selectedDayTasks.length > 0 ? (
                                        selectedDayTasks.map(task => (
                                            <div key={task.id} className={styles.reminderItem}>
                                                <div className={styles.reminderLeft}>
                                                    <div className={styles.remTime}>
                                                        {task.deadline ? format(new Date(task.deadline), 'hh:mm a') : 'Anytime'}
                                                    </div>
                                                    <div className={styles.remTitle}>{task.title}</div>
                                                </div>
                                                {task.completed && (
                                                    <div className={styles.remStatus}>Done</div>
                                                )}
                                                {!task.completed && (
                                                    <div className={styles.remStatus} style={{ color: `var(--status-${task.priority})`, background: `color-mix(in srgb, var(--status-${task.priority}) 10%, transparent)`}}>
                                                        Pending
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.noReminders}>
                                            No tasks scheduled for {format(selectedDate, 'MMM do')}.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <TaskModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialDate={selectedDate || undefined}
            />
        </div>
    );
}
