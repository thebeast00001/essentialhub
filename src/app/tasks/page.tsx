"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Check,
    Trash2,
    Clock,
    AlignLeft,
    Calendar,
    Target
} from 'lucide-react';
import { useTaskStore, Task, Priority } from '@/store/useTaskStore';
import { Badge } from '@/components/ui/UIComponents';
import styles from './Tasks.module.css';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function TasksPage() {
    const router = useRouter();
    const { tasks, addTask, updateTask, toggleTask, deleteTask, startTimer } = useTaskStore();
    
    const [quickTitle, setQuickTitle] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const stats = useMemo(() => ({
        total: tasks.filter(t => !t.completed).length,
        completed: tasks.filter(t => t.completed).length,
        high: tasks.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'critical')).length
    }), [tasks]);

    const activeTasks = useMemo(() => tasks.filter(t => !t.completed).sort((a,b) => b.order - a.order), [tasks]);
    const completedTasks = useMemo(() => tasks.filter(t => t.completed).slice(0, 10), [tasks]);
    
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

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1 className="text-gradient">ESSENTIAL Missions</h1>
                </div>

                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <span className={styles.statVal}>{stats.total}</span>
                        <span className={styles.statLabel}>Active</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statVal} style={{ color: 'var(--status-success)' }}>{stats.completed}</span>
                        <span className={styles.statLabel}>Done</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statVal} style={{ color: 'var(--status-danger)' }}>{stats.high}</span>
                        <span className={styles.statLabel}>Critical</span>
                    </div>
                </div>
            </header>

            <div className={styles.content}>
                
                {/* ─── Left Pane: Task List ─── */}
                <div className={styles.listPane}>
                    <form onSubmit={handleQuickAdd} className={styles.quickAdd}>
                        <input 
                            type="text" 
                            placeholder="Type a new mission and press Enter..." 
                            value={quickTitle}
                            onChange={e => setQuickTitle(e.target.value)}
                        />
                        <button type="submit" className={styles.submitBtn}>Add</button>
                    </form>

                    <div className={styles.taskList}>
                        {activeTasks.map(task => (
                            <div 
                                key={task.id} 
                                className={clsx(styles.taskItem, selectedTaskId === task.id && styles.selected)}
                                onClick={() => setSelectedTaskId(task.id)}
                            >
                                <button className={styles.checkBtn} onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}>
                                    <Check size={14} />
                                </button>
                                <div className={styles.taskInfo}>
                                    <h3 className={styles.taskTitle}>{task.title}</h3>
                                    <div className={styles.taskMeta}>
                                        <span>
                                            <span className={styles.priorityDot} style={{ background: `var(--status-${task.priority})` }} />
                                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                        </span>
                                        {task.deadline && (
                                            <span>• {format(new Date(task.deadline), 'MMM d')}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {completedTasks.length > 0 && <div style={{ marginTop: '20px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', paddingLeft: '10px' }}>RECENTLY COMPLETED</div>}
                        
                        {completedTasks.map(task => (
                            <div 
                                key={task.id} 
                                className={clsx(styles.taskItem, styles.completed, selectedTaskId === task.id && styles.selected)}
                                onClick={() => setSelectedTaskId(task.id)}
                            >
                                <button className={styles.checkBtn} onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}>
                                    <Check size={14} />
                                </button>
                                <div className={styles.taskInfo}>
                                    <h3 className={styles.taskTitle}>{task.title}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Right Pane: Focus Details ─── */}
                <div className={styles.detailsPane}>
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
                                    />
                                </div>

                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Status</span>
                                    <Badge variant={selectedTask.completed ? 'success' : 'default' as any}>
                                        {selectedTask.completed ? 'Completed' : 'In Progress'}
                                    </Badge>
                                </div>

                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Priority</span>
                                    <select 
                                        value={selectedTask.priority}
                                        onChange={(e) => updateTask(selectedTask.id, { priority: e.target.value as Priority })}
                                        style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                                    >
                                        <option value="low" style={{ background: '#111' }}>Low</option>
                                        <option value="medium" style={{ background: '#111' }}>Medium</option>
                                        <option value="high" style={{ background: '#111' }}>High</option>
                                        <option value="critical" style={{ background: '#111' }}>Critical</option>
                                    </select>
                                </div>

                                <div className={styles.metaRow} style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
                                    <span className={styles.metaLabel} style={{ marginBottom: '12px' }}>Description</span>
                                    <textarea 
                                        className={styles.descEditor}
                                        placeholder="Add notes, bullet points, or context..."
                                        value={selectedTask.description || ''}
                                        onChange={(e) => updateTask(selectedTask.id, { description: e.target.value })}
                                    />
                                </div>

                                <div className={styles.actionRow}>
                                    <button 
                                        className={styles.deleteBtn}
                                        onClick={() => { deleteTask(selectedTask.id); setSelectedTaskId(null); }}
                                        title="Delete Mission"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    
                                    {!selectedTask.completed && (
                                        <button className={styles.focusBtn} onClick={handleFocusStart}>
                                            <Clock size={20} />
                                            Enter Focus Mode
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>

            </div>
        </div>
    );
}
