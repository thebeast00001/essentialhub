"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui/UIComponents';
import { X, Calendar, Flag, Tag, Clock, AlignLeft, Check } from 'lucide-react';
import styles from './TaskModal.module.css';
import { useTaskStore, Priority } from '@/store/useTaskStore';
import { clsx } from 'clsx';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
}

const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'var(--status-success)' },
    { value: 'medium', label: 'Medium', color: 'var(--status-warning)' },
    { value: 'high', label: 'High', color: 'var(--status-danger)' },
    { value: 'critical', label: 'Critical', color: '#ff0000' },
];

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, initialDate }) => {
    const { addTask, getSuggestedTasks } = useTaskStore();
    const suggestions = getSuggestedTasks();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        deadline: '',
        priority: 'medium' as Priority,
        tags: [] as string[],
    });

    React.useEffect(() => {
        if (isOpen) {
            if (initialDate) {
                const pad = (n: number) => n.toString().padStart(2, '0');
                const d = initialDate;
                // Defaulting to 12:00 PM if it's just a newly clicked day, or keep actual time if passed
                const str = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T12:00`;
                setFormData(prev => ({ ...prev, deadline: str }));
            } else {
                setFormData(prev => ({ ...prev, deadline: '' }));
            }
        }
    }, [isOpen, initialDate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) return;

        addTask({
            ...formData,
            subtasks: [],
            tags: formData.tags.length > 0 ? formData.tags : ['General']
        });

        setFormData({
            title: '',
            description: '',
            deadline: '',
            priority: 'medium',
            tags: [],
        });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay}>
                    <motion.div
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className={styles.modalWrapper}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <Card className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2 className="text-gradient">Integrate New Mission</h2>
                                <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} className={styles.form}>
                                <div className={styles.inputGroup}>
                                    <input
                                        type="text"
                                        placeholder="Task Title"
                                        className={styles.titleInput}
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        autoFocus
                                    />
                                    {suggestions.length > 0 && (
                                        <div className={styles.suggestionsWrapper}>
                                            <span className={styles.suggestionLabel}>Suggestions:</span>
                                            {suggestions.map((sug, i) => (
                                                <button 
                                                    key={i} 
                                                    type="button" 
                                                    className={styles.suggestionChip}
                                                    onClick={() => setFormData({ ...formData, title: sug })}
                                                >
                                                    {sug}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.inputGroup}>
                                    <div className={styles.labelWithIcon}>
                                        <AlignLeft size={16} />
                                        <span>Description</span>
                                    </div>
                                    <textarea
                                        placeholder="Provide context for this task..."
                                        className={styles.descInput}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className={styles.metaGrid}>
                                    <div className={styles.inputGroup}>
                                        <div className={styles.labelWithIcon}>
                                            <Calendar size={16} />
                                            <span>Deadline</span>
                                        </div>
                                        <input
                                            type="datetime-local"
                                            className={styles.metaInput}
                                            value={formData.deadline}
                                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                        />
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <div className={styles.labelWithIcon}>
                                            <Flag size={16} />
                                            <span>Priority</span>
                                        </div>
                                        <div className={styles.priorityGrid}>
                                            {priorities.map((p) => (
                                                <button
                                                    key={p.value}
                                                    type="button"
                                                    className={clsx(styles.priorityBtn, formData.priority === p.value && styles.activePriority)}
                                                    onClick={() => setFormData({ ...formData, priority: p.value })}
                                                    style={{ '--p-color': p.color } as any}
                                                >
                                                    {p.label}
                                                    {formData.priority === p.value && <Check size={12} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.footer}>
                                    <Button type="button" variant="ghost" onClick={onClose}>Abort</Button>
                                    <Button type="submit" className={styles.submitBtn}>
                                        Initialize Task
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
