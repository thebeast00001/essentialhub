"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    Plus,
    Check,
    Trash2,
    Clock,
    AlignLeft,
    Calendar,
    Target,
    Zap,
    Sparkles,
    CalendarClock,
    CalendarDays,
    CalendarRange,
    LayoutList
} from 'lucide-react';
import { useTaskStore, Task, Priority } from '@/store/useTaskStore';
import { Badge } from '@/components/ui/UIComponents';
import styles from './Tasks.module.css';
import { clsx } from 'clsx';
import { format, startOfWeek, endOfWeek, isWithinInterval, startOfDay, endOfDay, isBefore } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { TaskModal } from '@/components/tasks/TaskModal';

type TimeFrame = 'today' | 'week' | 'all';

const TIME_FRAME_CONFIG: { id: TimeFrame; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'today', label: 'Today', icon: CalendarDays, description: "Today's missions" },
    { id: 'week', label: 'This Week', icon: CalendarRange, description: 'This week' },
    { id: 'all', label: 'All Tasks', icon: LayoutList, description: 'All time' },
];

export default function TasksPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('today');

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: 'spring', stiffness: 100, damping: 15 }
        }
    };
    
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const { tasks, addTask, updateTask, toggleTask, deleteTask, startTimer, generateAutoPilotSchedule } = useTaskStore();
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [todayStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [quickTitle, setQuickTitle] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isToday = (date: string | Date) => format(new Date(date), 'yyyy-MM-dd') === todayStr;
    
    const isThisWeek = (date: string | Date) => {
        const d = new Date(date);
        const now = new Date();
        return isWithinInterval(d, { start: startOfWeek(now), end: endOfWeek(now) });
    };

    const formatForInput = (dateString?: string) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        } catch (e) {
            return '';
        }
    };

    const filterByTimeFrame = (task: Task) => {
        // Priority for filtering: scheduled_start > deadline > createdAt
        const dateToCheck = task.scheduled_start || task.deadline || task.createdAt;
        
        if (timeFrame === 'today') {
            // Include: due today, scheduled today, OR is uncompleted and from the past (overdue)
            const dueToday = isToday(dateToCheck);
            const overdue = !task.completed && isBefore(new Date(dateToCheck), startOfDay(new Date()));
            return dueToday || overdue;
        }
        
        if (timeFrame === 'week') return isThisWeek(dateToCheck);
        return true; // 'all'
    };

    const stats = useMemo(() => {
        const filtered = tasks.filter(filterByTimeFrame);
        return {
            total: filtered.filter(t => !t.completed).length,
            completed: filtered.filter(t => t.completed).length,
            high: filtered.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'critical')).length
        };
    }, [tasks, timeFrame, todayStr]);

    const activeTasks = useMemo(() =>
        tasks
            .filter(t => !t.completed && filterByTimeFrame(t))
            .sort((a, b) => b.order - a.order),
    [tasks, timeFrame, todayStr]);

    const completedTasks = useMemo(() =>
        tasks
            .filter(t => t.completed && filterByTimeFrame(t))
            .slice(0, 10),
    [tasks, timeFrame, todayStr]);
    
    const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

    const handleQuickAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickTitle.trim()) return;
        addTask({
            title: quickTitle,
            description: '',
            priority: 'medium',
            tags: ['General'],
            subtasks: [],
            deadline: ''
        });
        setQuickTitle('');
    };

    const handleFocusStart = () => {
        if (selectedTask) {
            startTimer(selectedTask.id);
            router.push('/focus');
        }
    };

    const handleGenerateSchedule = async () => {
        setIsGenerating(true);
        setTimeout(async () => {
            await generateAutoPilotSchedule();
            setIsGenerating(false);
        }, 1500);
    };

    return (
        <motion.div 
            className={styles.container}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <header className={styles.header}>
                <motion.div className={styles.titleArea} variants={itemVariants}>
                    <h1 className={styles.pageTitle}>Tasks</h1>
                    <div className={styles.dailyMantra}>
                        <Sparkles size={14} className={styles.mantraIcon} />
                        <span>Master your day, one mission at a time.</span>
                    </div>
                </motion.div>

                <motion.div className={styles.stats} variants={itemVariants}>
                    <div className={styles.statItem}>
                        <span className={styles.statVal}>{mounted ? stats.total : 0}</span>
                        <span className={styles.statLabel}>Active</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statVal} style={{ color: 'var(--status-success)' }}>{mounted ? stats.completed : 0}</span>
                        <span className={styles.statLabel}>Done</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statVal} style={{ color: 'var(--status-danger)' }}>{mounted ? stats.high : 0}</span>
                        <span className={styles.statLabel}>Critical</span>
                    </div>
                </motion.div>
            </header>

            {/* ─── Timeframe Selector ─── */}
            <motion.div className={styles.timeFrameBar} variants={itemVariants}>
                {TIME_FRAME_CONFIG.map(tf => {
                    const Icon = tf.icon;
                    return (
                        <button
                            key={tf.id}
                            className={clsx(styles.timeFrameBtn, timeFrame === tf.id && styles.timeFrameActive)}
                            onClick={() => setTimeFrame(tf.id)}
                        >
                            <Icon size={15} className={styles.timeFrameIcon} />
                            <span className={styles.timeFrameLabel}>{tf.label}</span>
                            {timeFrame === tf.id && (
                                <motion.div 
                                    className={styles.timeFrameIndicator}
                                    layoutId="timeframe-indicator"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                        </button>
                    );
                })}
            </motion.div>

            <div className={styles.content}>
                
                {/* ─── Left Pane: Task List ─── */}
                <motion.div className={styles.listPane} variants={itemVariants}>
                    <div className={styles.addSection}>
                        <form onSubmit={handleQuickAdd} className={styles.quickAdd}>
                            <input 
                                type="text" 
                                placeholder="Type a new mission and press Enter..." 
                                value={quickTitle}
                                onChange={e => setQuickTitle(e.target.value)}
                                suppressHydrationWarning
                            />
                            <button type="submit" className={styles.submitBtn} suppressHydrationWarning>
                                <Plus size={18} />
                            </button>
                        </form>
                        <button 
                            className={styles.fullAddBtn} 
                            onClick={() => setIsModalOpen(true)}
                            title="Add Detailed Task"
                        >
                            <Calendar size={18} />
                        </button>
                    </div>

                    <div className={styles.taskList}>
                        <AnimatePresence>
                            {mounted && activeTasks.map((task, index) => (
                                <motion.div 
                                    key={task.id} 
                                    className={clsx(
                                        styles.taskItem, 
                                        selectedTaskId === task.id && styles.selected,
                                        mounted && theme === 'oceanic' && `theme-pastel-${(index % 4) + 1}`
                                    )}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => setSelectedTaskId(task.id)}
                                >
                                    <button className={styles.checkBtn} onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} suppressHydrationWarning>
                                        <Check size={14} />
                                    </button>
                                    <div className={styles.taskInfo}>
                                        <h3 className={styles.taskTitle}>{task.title}</h3>
                                        <div className={styles.taskMeta}>
                                            <span>
                                                <span className={styles.priorityDot} style={{ background: `var(--status-${task.priority})` }} />
                                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                            </span>
                                            {task.is_auto_scheduled && task.scheduled_start && (
                                                <span className={styles.aiScheduledTime}>
                                                    <Sparkles size={10} style={{ marginRight: '4px' }} />
                                                    {format(new Date(task.scheduled_start), 'h:mm a')}
                                                </span>
                                            )}
                                            {task.deadline && (
                                                <span>• {format(new Date(task.deadline), 'MMM d')}</span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {mounted && activeTasks.length === 0 && (
                            <div className={styles.emptyList}>
                                <Target size={32} opacity={0.3} />
                                <span>No active tasks {timeFrame === 'today' ? 'for today' : timeFrame === 'week' ? 'this week' : ''}. Add one above!</span>
                            </div>
                        )}

                        {mounted && completedTasks.length > 0 && <div className={styles.sectionLabel}>RECENTLY COMPLETED</div>}
                        
                        <AnimatePresence>
                            {mounted && completedTasks.map((task, index) => (
                                <motion.div 
                                    key={task.id} 
                                    className={clsx(
                                        styles.taskItem, 
                                        styles.completed, 
                                        selectedTaskId === task.id && styles.selected,
                                        mounted && theme === 'oceanic' && `theme-pastel-${((index + activeTasks.length) % 4) + 1}`
                                    )}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.7 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelectedTaskId(task.id)}
                                >
                                    <button className={styles.checkBtn} onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} suppressHydrationWarning>
                                        <Check size={14} />
                                    </button>
                                    <div className={styles.taskInfo}>
                                        <h3 className={styles.taskTitle}>{task.title}</h3>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* ─── Right Pane: Focus Details ─── */}
                <motion.div className={styles.detailsPane} variants={itemVariants}>
                    <div className={styles.autoPilotSection}>
                        <div className={styles.autoPilotHeader}>
                            <div className={styles.autoPilotTitle}>
                                <Sparkles size={16} className={styles.sparkleIcon} />
                                <span>AI Optimization</span>
                            </div>
                            <p className={styles.autoPilotDesc}>Let AI organize your missions based on priority and energy peak.</p>
                        </div>
                        <button 
                            className={styles.autoPilotBtn}
                            onClick={handleGenerateSchedule}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Sparkles size={18} className={styles.pulseIcon} />
                                    Synching Orbit...
                                </>
                            ) : (
                                <>
                                    <CalendarClock size={18} />
                                    Generate Auto-Pilot
                                </>
                            )}
                        </button>
                    </div>

                    {!selectedTask ? (
                        <div className={styles.emptyDetails}>
                            <Target size={48} opacity={0.2} />
                            <span>Select a mission to view details or start a focus session.</span>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={selectedTask.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}
                            >
                                <div className={styles.detailsHeader}>
                                    <input 
                                        value={selectedTask.title}
                                        onChange={(e) => updateTask(selectedTask.id, { title: e.target.value })}
                                        className={styles.titleEdit}
                                        suppressHydrationWarning
                                    />
                                </div>

                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Status</span>
                                    <Badge variant={selectedTask.completed ? 'success' : 'default' as any}>
                                        {selectedTask.completed ? 'Completed' : 'In Progress'}
                                    </Badge>
                                </div>

                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Starts</span>
                                    <input 
                                        type="datetime-local"
                                        value={formatForInput(selectedTask.scheduled_start)}
                                        onChange={(e) => updateTask(selectedTask.id, { scheduled_start: e.target.value })}
                                        className={styles.timeInput}
                                        suppressHydrationWarning
                                    />
                                </div>

                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Ends</span>
                                    <input 
                                        type="datetime-local"
                                        value={formatForInput(selectedTask.scheduled_end)}
                                        onChange={(e) => updateTask(selectedTask.id, { scheduled_end: e.target.value })}
                                        className={styles.timeInput}
                                        suppressHydrationWarning
                                    />
                                </div>

                                <div className={styles.metaRow} style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                                    <span className={styles.metaLabel} style={{ marginBottom: '12px' }}>Description</span>
                                    <textarea 
                                        className={styles.descEditor}
                                        placeholder="Add notes, bullet points, or context..."
                                        value={selectedTask.description || ''}
                                        onChange={(e) => updateTask(selectedTask.id, { description: e.target.value })}
                                        suppressHydrationWarning
                                    />
                                </div>

                                <div className={styles.actionRow}>
                                    <button 
                                        className={styles.deleteBtn}
                                        onClick={() => { deleteTask(selectedTask.id); setSelectedTaskId(null); }}
                                        title="Delete Mission"
                                        suppressHydrationWarning
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    
                                    {!selectedTask.completed && (
                                        <button className={styles.focusBtn} onClick={handleFocusStart} suppressHydrationWarning>
                                            <Clock size={20} />
                                            Enter Focus Mode
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}
                </motion.div>
            </div>

            <TaskModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
        </motion.div>
    );
}
