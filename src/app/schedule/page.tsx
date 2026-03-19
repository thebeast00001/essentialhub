"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
    isSameMonth,
    parseISO,
    startOfYear,
    endOfYear,
    eachMonthOfInterval,
    addYears,
    subYears,
    addWeeks,
    subWeeks,
    startOfDay,
    endOfDay,
    eachHourOfInterval,
    isToday,
    getTime
} from 'date-fns';
import { 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Calendar as CalendarIcon, 
    Search, 
    Settings, 
    Menu, 
    Check, 
    Clock, 
    Filter,
    MoreVertical,
    ChevronDown,
    X
} from 'lucide-react';
import { useTaskStore, Task } from '@/store/useTaskStore';
import styles from './Schedule.module.css';
import { clsx } from 'clsx';
import { TaskModal } from '@/components/tasks/TaskModal';
import { useTheme } from 'next-themes';

type ViewMode = 'day' | 'week' | 'month' | 'year' | 'schedule';

export default function SchedulePage() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewSwitcherOpen, setIsViewSwitcherOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Store data
    const tasks = useTaskStore((state) => state.tasks);
    const toggleTask = useTaskStore((state) => state.toggleTask);

    useEffect(() => {
        setMounted(true);
    }, []);

    // ─── Navigation Logic ────────────────────────────────

    const handlePrev = () => {
        switch (viewMode) {
            case 'day': setCurrentDate(addDays(currentDate, -1)); break;
            case 'week': setCurrentDate(subWeeks(currentDate, 1)); break;
            case 'month': setCurrentDate(subMonths(currentDate, 1)); break;
            case 'year': setCurrentDate(subYears(currentDate, 1)); break;
            case 'schedule': setCurrentDate(subMonths(currentDate, 1)); break;
        }
    };

    const handleNext = () => {
        switch (viewMode) {
            case 'day': setCurrentDate(addDays(currentDate, 1)); break;
            case 'week': setCurrentDate(addWeeks(currentDate, 1)); break;
            case 'month': setCurrentDate(addMonths(currentDate, 1)); break;
            case 'year': setCurrentDate(addYears(currentDate, 1)); break;
            case 'schedule': setCurrentDate(addMonths(currentDate, 1)); break;
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    // ─── Mini Calendar Logic ─────────────────────────────
    
    const [miniCalDate, setMiniCalDate] = useState(new Date());
    
    const miniCalDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(miniCalDate));
        const end = endOfWeek(endOfMonth(miniCalDate));
        return eachDayOfInterval({ start, end });
    }, [miniCalDate]);

    // ─── View Headers & Grid Data ────────────────────────

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate);
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [currentDate]);

    const monthDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentDate));
        const end = endOfWeek(endOfMonth(currentDate));
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const hours = eachHourOfInterval({
        start: startOfDay(new Date()),
        end: endOfDay(new Date())
    });

    const getTasksForDate = (date: Date) => {
        // Tasks scheduled for this date
        const scheduled = tasks.filter(t => t.scheduled_start && isSameDay(parseISO(t.scheduled_start), date));
        
        // Completed tasks that don't have a scheduled_start but were completed on this date
        const completedOnDate = tasks.filter(t => 
            t.completed && 
            t.completedAt && 
            isSameDay(parseISO(t.completedAt), date) &&
            !t.scheduled_start  // avoid duplicates
        );
        
        return [...scheduled, ...completedOnDate];
    };

    const calculateTaskPosition = (task: Task) => {
        // Use scheduled times if available
        if (task.scheduled_start) {
            const start = parseISO(task.scheduled_start);
            const startHour = start.getHours();
            const startMin = start.getMinutes();
            
            let durationMin = 60; // Default 1 hour
            if (task.scheduled_end) {
                const end = parseISO(task.scheduled_end);
                durationMin = (end.getTime() - start.getTime()) / (1000 * 60);
            }
            
            return {
                top: (startHour * 60) + startMin,
                height: Math.max(durationMin, 30)
            };
        }
        
        // Fallback: use completedAt to position completed tasks without scheduled time
        if (task.completed && task.completedAt) {
            const completedTime = parseISO(task.completedAt);
            const hour = completedTime.getHours();
            const min = completedTime.getMinutes();
            return {
                top: (hour * 60) + min,
                height: 60 // Default 1 hour block for unscheduled completed tasks
            };
        }
        
        // Final fallback: stack at top
        return { top: 0, height: 60 };
    };

    /* Priority and Color logic handled via CSS */

    const getTaskColorClass = (task: Task) => {
        let hash = 0;
        const seedStr = task.title + task.id;
        for (let i = 0; i < seedStr.length; i++) {
            hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % 8;
        return styles[`taskColor_${index}`];
    };

    // ─── Components ──────────────────────────────────────

    if (!mounted) return null;

    /**
     * SIDEBAR: Mini Calendar & Filters
     */
    const renderSidebar = () => (
        <aside className={clsx(styles.sidebar, !isSidebarOpen && styles.sidebarClosed)}>
            <div className={styles.sidebarContent}>
                <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
                    <Plus size={24} />
                    <span>Create</span>
                </button>

                {/* Mini Calendar */}
                <div className={styles.miniCal}>
                    <div className={styles.miniCalHeader}>
                        <span>{format(miniCalDate, 'MMMM yyyy')}</span>
                        <div className={styles.miniCalNav}>
                            <button onClick={() => setMiniCalDate(subMonths(miniCalDate, 1))}><ChevronLeft size={16} /></button>
                            <button onClick={() => setMiniCalDate(addMonths(miniCalDate, 1))}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                    <div className={styles.miniCalGrid}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={`${d}-${i}`} className={styles.miniCalDayLabel}>{d}</div>
                        ))}
                        {miniCalDays.map(day => (
                            <button 
                                key={day.toISOString()}
                                onClick={() => {
                                    setCurrentDate(day);
                                    setSelectedDate(day);
                                }}
                                className={clsx(
                                    styles.miniCalDay,
                                    !isSameMonth(day, miniCalDate) && styles.miniCalDayOther,
                                    isSameDay(day, new Date()) && styles.miniCalDayToday,
                                    isSameDay(day, selectedDate) && styles.miniCalDaySelected
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );

    /**
     * MAIN AREA: Header
     */
    const renderHeader = () => {
        let dateRangeText = "";
        switch (viewMode) {
            case 'day': dateRangeText = format(currentDate, 'MMMM d, yyyy'); break;
            case 'week': {
                const start = startOfWeek(currentDate);
                const end = endOfWeek(currentDate);
                if (isSameMonth(start, end)) {
                    dateRangeText = `${format(start, 'MMMM')} ${format(currentDate, 'yyyy')}`;
                } else {
                    dateRangeText = `${format(start, 'MMM')} – ${format(end, 'MMM')} ${format(currentDate, 'yyyy')}`;
                }
                break;
            }
            case 'month': dateRangeText = format(currentDate, 'MMMM yyyy'); break;
            case 'year': dateRangeText = format(currentDate, 'yyyy'); break;
            case 'schedule': dateRangeText = format(currentDate, 'MMMM yyyy'); break;
        }

        return (
            <header className={styles.mainHeader}>
                <div className={styles.headerLeft}>
                    <button className={styles.menuBtn} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Menu size={20} />
                    </button>
                    <div className={styles.logoSection}>
                        <CalendarIcon size={28} className={styles.logoIcon} />
                        <span className={styles.logoText}>Calendar</span>
                    </div>
                    <button className={styles.todayBtn} onClick={handleToday}>Today</button>
                    <div className={styles.navArrows}>
                        <button onClick={handlePrev} title="Previous"><ChevronLeft size={20} /></button>
                        <button onClick={handleNext} title="Next"><ChevronRight size={20} /></button>
                    </div>
                    <h2 className={styles.dateRange}>{dateRangeText}</h2>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.headerActions}>
                        <div className={styles.viewSwitcher}>
                            <button 
                                className={styles.switcherBtn}
                                onClick={() => setIsViewSwitcherOpen(!isViewSwitcherOpen)}
                            >
                                {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} <ChevronDown size={14} />
                            </button>
                            
                            <AnimatePresence>
                                {isViewSwitcherOpen && (
                                    <motion.div 
                                        className={styles.switcherDropdown}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        {(['day', 'week', 'month', 'year', 'schedule'] as ViewMode[]).map(m => (
                                            <button 
                                                key={m} 
                                                onClick={() => {
                                                    setViewMode(m);
                                                    setIsViewSwitcherOpen(false);
                                                }}
                                                className={clsx(viewMode === m && styles.activeMode)}
                                            >
                                                {m.charAt(0).toUpperCase() + m.slice(1)}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>
        );
    };

    /**
     * WEEK VIEW MAPPING
     */
    const renderWeekView = () => (
        <div className={styles.weekView}>
            <div className={styles.weekHeader}>
                <div className={styles.timeColumnSpacer} />
                {weekDays.map(day => (
                    <div 
                        key={day.toISOString()} 
                        className={clsx(
                            styles.weekDayHeader, 
                            isToday(day) && styles.weekToday,
                            styles[`day_${format(day, 'eee').toLowerCase()}`]
                        )}
                    >
                        <span className={styles.dayName}>{format(day, 'EEE').toUpperCase()}</span>
                        <span className={styles.dayNumber}>{format(day, 'd')}</span>
                    </div>
                ))}
            </div>
            
            <div className={styles.scrollArea}>
                <div className={styles.weekGrid}>
                    {/* Horizontal lines */}
                    <div className={styles.timeLines}>
                        {hours.map(hour => (
                            <div key={hour.toISOString()} className={styles.timeRow}>
                                <span className={styles.timeLabel}>{format(hour, 'h a')}</span>
                                <div className={styles.rowLine} />
                            </div>
                        ))}
                    </div>

                    {/* Columns for days */}
                    <div className={styles.columnsContainer}>
                        {weekDays.map(day => {
                            const dayTasks = getTasksForDate(day);
                            return (
                                <div key={day.toISOString()} className={styles.dayColumn}>
                                    {dayTasks.map(task => {
                                        const { top, height } = calculateTaskPosition(task);
                                        return (
                                        <div 
                                            key={task.id} 
                                            className={clsx(
                                                styles.eventBlock, 
                                                getTaskColorClass(task),
                                                styles[task.priority],
                                                task.completed && styles.eventCompleted
                                            )}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                            onClick={() => toggleTask(task.id)}
                                            title={task.completed ? 'Click to undo' : 'Click to complete'}
                                        >
                                                <div className={styles.eventContent}>
                                                    {task.completed && <span className={styles.eventDoneCheck}>✓</span>}
                                                    <span className={clsx(styles.eventTitle, task.completed && styles.eventTitleDone)}>{task.title}</span>
                                                    {(task.scheduled_start || (task.completed && task.completedAt)) && (
                                                        <span className={styles.eventTab}>
                                                            {format(parseISO(task.scheduled_start || task.completedAt || ''), 'h:mm a')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    /**
     * MONTH VIEW MAPPING
     */
    const renderMonthView = () => (
        <div className={styles.monthView}>
            <div className={styles.gridHeader}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                    <div key={d} className={styles.gridHeaderDay}>{d}</div>
                ))}
            </div>
            <div className={styles.monthGrid}>
                {monthDays.map(day => {
                    const dayTasks = getTasksForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    return (
                        <div 
                            key={day.toISOString()} 
                            className={clsx(
                                styles.monthDayCell, 
                                !isCurrentMonth && styles.notCurrentMonth,
                                isToday(day) && styles.monthToday
                            )}
                            onClick={() => {
                                setSelectedDate(day);
                                setViewMode('day');
                            }}
                        >
                            <span className={styles.dayNum}>{format(day, 'd')}</span>
                            <div className={styles.monthTaskContainer}>
                                {dayTasks.map(t => (
                                    <div 
                                        key={t.id} 
                                        className={clsx(
                                            styles.monthTask, 
                                            styles[`task_${t.priority}`],
                                            t.completed && styles.monthTaskDone
                                        )}
                                        onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }}
                                        title={t.completed ? 'Click to undo' : 'Click to complete'}
                                    >
                                        <div className={clsx(styles.taskBullet, t.completed && styles.taskBulletDone)} />
                                        <span className={clsx(t.completed && styles.monthTaskDoneText)}>{t.title}</span>
                                        {t.completed && <span className={styles.monthTaskCheck}>✓</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    /**
     * YEAR VIEW MAPPING
     */
    const renderYearView = () => {
        const months = Array.from({ length: 12 }, (_, i) => startOfMonth(addMonths(startOfYear(currentDate), i)));
        return (
            <div className={styles.yearView}>
                {months.map(month => (
                    <div key={month.toISOString()} className={styles.yearMonth}>
                        <h3 className={styles.yearMonthTitle}>{format(month, 'MMMM')}</h3>
                        <div className={styles.yearMonthGrid}>
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <div key={`${d}-${i}`} className={styles.yearDayLabel}>{d}</div>
                            ))}
                            {eachDayOfInterval({ 
                                start: startOfWeek(startOfMonth(month)), 
                                end: endOfWeek(endOfMonth(month)) 
                            }).map(day => (
                                <div 
                                    key={day.toISOString()} 
                                    className={clsx(
                                        styles.yearDayCell,
                                        !isSameMonth(day, month) && styles.yearDayOther,
                                        isToday(day) && styles.yearDayToday
                                    )}
                                >
                                    {format(day, 'd')}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    /**
     * DAY VIEW MAPPING
     */
    const renderDayView = () => (
        <div className={styles.dayViewOuter}>
            <div className={styles.dayHeaderRow}>
                <div className={styles.timeColumnSpacer} />
                <div className={clsx(
                    styles.dayHeaderContent, 
                    isToday(currentDate) && styles.dayToday,
                    styles[`day_${format(currentDate, 'eee').toLowerCase()}`]
                )}>
                    <span className={styles.dayNameBig}>{format(currentDate, 'EEEE').toUpperCase()}</span>
                    <span className={styles.dayNumberBig}>{format(currentDate, 'd')}</span>
                </div>
            </div>
            <div className={styles.scrollArea}>
                <div className={styles.weekGrid}>
                    <div className={styles.timeLines}>
                        {hours.map(hour => (
                            <div key={hour.toISOString()} className={styles.timeRow}>
                                <span className={styles.timeLabel}>{format(hour, 'h a')}</span>
                                <div className={styles.rowLine} />
                            </div>
                        ))}
                    </div>
                    <div className={styles.columnsContainer}>
                        <div className={clsx(styles.dayColumn, styles.dayColumnSingle)}>
                            {getTasksForDate(currentDate).map(task => {
                                const { top, height } = calculateTaskPosition(task);
                                return (
                                    <div 
                                        key={task.id} 
                                        className={clsx(
                                            styles.eventBlock, 
                                            getTaskColorClass(task),
                                            styles[task.priority],
                                            task.completed && styles.eventCompleted
                                        )} 
                                        style={{ top: `${top}px`, height: `${height}px` }}
                                        onClick={() => toggleTask(task.id)}
                                        title={task.completed ? 'Click to undo' : 'Click to complete'}
                                    >
                                        <div className={styles.eventContent}>
                                            {task.completed && <span className={styles.eventDoneCheck}>✓</span>}
                                            <h3 className={clsx(styles.eventTitleBig, task.completed && styles.eventTitleDone)}>{task.title}</h3>
                                            {(task.scheduled_start || (task.completed && task.completedAt)) && (
                                                <span className={styles.eventTab}>
                                                    {format(parseISO(task.scheduled_start || task.completedAt || ''), 'h:mm a')}
                                                    {task.scheduled_end && ` – ${format(parseISO(task.scheduled_end), 'h:mm a')}`}
                                                </span>
                                            )}
                                            {task.description && <p className={styles.eventDesc}>{task.description}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={clsx(styles.container, theme === 'oceanic' && styles.oceanic)}>
            {renderSidebar()}
            <main className={styles.mainContent}>
                {renderHeader()}
                <div className={styles.viewContainer}>
                    {viewMode === 'day' && renderDayView()}
                    {viewMode === 'week' && renderWeekView()}
                    {viewMode === 'month' && renderMonthView()}
                    {viewMode === 'year' && renderYearView()}
                    {viewMode === 'schedule' && renderMonthView() /* Placeholder */}
                </div>
            </main>

            <TaskModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                initialDate={selectedDate}
            />
        </div>
    );
}
