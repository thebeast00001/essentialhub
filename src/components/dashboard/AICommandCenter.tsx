"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Terminal, ArrowRight, User, Bot, Zap, CheckCircle2, Clock } from 'lucide-react';
import { useTaskStore, getLocalDateStr } from '@/store/useTaskStore';
import styles from './AICommandCenter.module.css';
import { clsx } from 'clsx';

export const AICommandCenter = () => {
    const [mounted, setMounted] = useState(false);
    const [input, setInput] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const [history, setHistory] = useState<{ role: 'user' | 'bot', content: string | React.ReactNode }[]>([
        { role: 'bot', content: "Awaiting command, Operator. How can I assist your productivity today?" }
    ]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const store = useTaskStore();
    
    useEffect(() => {
        if (scrollRef.current && mounted) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, mounted]);

    if (!mounted) return null;
    
    const { tasks, habits, productivityScore, addTask, toggleTask, startTimer } = store;

    const processCommand = (cmd: string) => {
        const lowerCmd = cmd.toLowerCase();
        let response: string | React.ReactNode = "I'm sorry, I don't recognize that command yet. Try asking for 'status' or 'add task [title]'.";

        // 1. Status Check
        if (lowerCmd.includes('status') || lowerCmd.includes('summary')) {
            const pending = tasks.filter(t => !t.completed).length;
            const done = tasks.filter(t => t.completed).length;
            response = (
                <div className={styles.richResponse}>
                    <p>Current System Status:</p>
                    <ul>
                        <li><Zap size={12} /> Efficiency: {productivityScore}%</li>
                        <li><Zap size={12} /> Tasks: {done} completed, {pending} pending</li>
                        <li><Zap size={12} /> Habits: {habits.filter(h => h.completedToday).length} checked today</li>
                    </ul>
                </div>
            );
        }

        // 2. Add Task
        else if (lowerCmd.startsWith('add task') || lowerCmd.startsWith('create task')) {
            const title = cmd.split(/task/i)[1]?.trim();
            if (title) {
                addTask({ title, priority: 'medium', tags: ['AI_Command'], subtasks: [] });
                response = `Affirmative. Task "${title}" has been injected into your primary pipeline.`;
            } else {
                response = "Please specify a task title. Example: 'Add task finish report'.";
            }
        }

        // 3. Focus / Timer
        else if (lowerCmd.includes('start timer') || lowerCmd.includes('focus')) {
            startTimer();
            response = "Focus sequence initiated. The timer is now active.";
        }

        // 4. Tasks Query
        else if (lowerCmd.includes('tasks') && (lowerCmd.includes('show') || lowerCmd.includes('what'))) {
            const pendingList = tasks.filter(t => !t.completed);
            if (pendingList.length === 0) {
                response = "Your pipeline is clear. All current tasks are satisfied.";
            } else {
                response = (
                    <div className={styles.richResponse}>
                        <p>Immediate Priorities:</p>
                        {pendingList.slice(0, 3).map(t => (
                            <div key={t.id} className={styles.taskLine}>• {t.title}</div>
                        ))}
                        {pendingList.length > 3 && <p className={styles.moreLabel}>+ {pendingList.length - 3} more</p>}
                    </div>
                );
            }
        }

        // 5. Habits Query
        else if (lowerCmd.includes('habit')) {
            const missing = habits.filter(h => !h.completedToday);
            if (missing.length === 0) {
                response = "All daily rituals are complete. Peak discipline achieved.";
            } else {
                response = `You still have ${missing.length} habits to fulfill today. Stay consistent.`;
            }
        }

        setHistory(prev => [...prev, { role: 'bot', content: response }]);
    };

    const QuickActions = () => (
        <div className={styles.quickActions}>
            <button className={styles.actionChip} onClick={() => {
                setHistory(prev => [...prev, { role: 'user', content: 'Status summary' }]);
                setTimeout(() => processCommand('status'), 300);
            }}>
                <Zap size={10} />
                Summary
            </button>
            <button className={styles.actionChip} onClick={() => {
                setHistory(prev => [...prev, { role: 'user', content: 'Show my tasks' }]);
                setTimeout(() => processCommand('show tasks'), 300);
            }}>
                <CheckCircle2 size={10} />
                Tasks
            </button>
            <button className={styles.actionChip} onClick={() => {
                setHistory(prev => [...prev, { role: 'user', content: 'Check habits' }]);
                setTimeout(() => processCommand('habit'), 300);
            }}>
                <Sparkles size={10} />
                Habits
            </button>
            <button className={styles.actionChip} onClick={() => {
                setHistory(prev => [...prev, { role: 'user', content: 'Start focus timer' }]);
                setTimeout(() => processCommand('start timer'), 300);
            }}>
                <Clock size={10} />
                Timer
            </button>
        </div>
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setHistory(prev => [...prev, { role: 'user', content: input }]);
        const currentInput = input;
        setInput('');
        
        // Simulate "thinking" for legit feel
        setTimeout(() => processCommand(currentInput), 300);
    };

    const [isActionsVisible, setIsActionsVisible] = useState(true);

    return (
        <div className={styles.sidebarPanel}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <Terminal size={14} />
                    <span>ESSENTIAL ASSISTANT</span>
                </div>
                <div 
                    className={styles.toggleActionsBtn}
                    onClick={() => setIsActionsVisible(!isActionsVisible)}
                    title={isActionsVisible ? "Hide Quick Actions" : "Show Quick Actions"}
                >
                    <Zap size={14} fill={isActionsVisible ? "currentColor" : "none"} />
                </div>
            </div>

            <div className={styles.terminalBody} ref={scrollRef}>
                {history.map((msg, i) => (
                    <div key={i} className={clsx(styles.message, msg.role === 'bot' ? styles.bot : styles.user)}>
                        <div className={styles.avatar}>
                            {msg.role === 'bot' ? <Bot size={12} /> : <User size={12} />}
                        </div>
                        <div className={styles.msgContent}>
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {isActionsVisible && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={styles.quickActionsWrapper}
                    >
                        <QuickActions />
                    </motion.div>
                )}
            </AnimatePresence>

            <form className={styles.inputArea} onSubmit={handleSubmit}>
                <ArrowRight size={16} className={styles.promptIcon} />
                <input 
                    type="text" 
                    className={styles.input}
                    placeholder="Command..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    suppressHydrationWarning={true}
                />
            </form>
        </div>
    );
};
