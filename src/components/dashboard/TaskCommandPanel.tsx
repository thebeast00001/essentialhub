"use client";

import React, { useMemo, useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, GripVertical, Clock, MoreVertical, Trash2, Search, AlertCircle } from 'lucide-react';
import { useTaskStore, Task } from '@/store/useTaskStore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/UIComponents';
import styles from './TaskCommandPanel.module.css';
import { clsx } from 'clsx';

interface SortableTaskItemProps {
    task: Task;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({ task }) => {
    const { toggleTask, deleteTask, updateTask } = useTaskStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(task.title);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const isMissed = useMemo(() => {
        return !task.completed && task.deadline && new Date(task.deadline) < new Date();
    }, [task]);

    const handleUpdate = () => {
        if (editValue.trim() && editValue !== task.title) {
            updateTask(task.id, { title: editValue });
        }
        setIsEditing(false);
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={styles.taskOuter}>
            <motion.div
                className={clsx(
                    'glass-surface',
                    styles.taskCard,
                    task.completed && styles.completed,
                    isMissed && styles.missedTask
                )}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
            >
                <div {...attributes} {...listeners} className={styles.dragHandle}>
                    <GripVertical size={16} />
                </div>

                <button
                    className={styles.checkBtn}
                    onClick={() => toggleTask(task.id)}
                >
                    <div className={clsx(styles.checkOuter, task.completed && styles.checkActive)}>
                        {task.completed && <CheckCircle2 size={16} />}
                    </div>
                </button>

                <div className={styles.taskInfo} onDoubleClick={() => setIsEditing(true)}>
                    {isEditing ? (
                        <input
                            autoFocus
                            className={styles.inlineInput}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                        />
                    ) : (
                        <h3 className={styles.taskTitle}>{task.title}</h3>
                    )}

                    <div className={styles.taskMeta}>
                        <Badge variant={task.priority as any}>{task.priority}</Badge>
                        {isMissed && (
                            <span className={styles.missedBadge}>
                                <AlertCircle size={10} />
                                LATE
                            </span>
                        )}
                        {task.deadline && (
                            <span className={styles.deadline}>
                                <Clock size={12} />
                                {format(new Date(task.deadline), 'MMM d, h:mm a')}
                            </span>
                        )}
                    </div>
                </div>

                <div className={styles.actions}>
                    <button className={styles.deleteBtn} onClick={() => deleteTask(task.id)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export const TaskCommandPanel = () => {
    const { tasks, reorderTasks } = useTaskStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const filteredTasks = useMemo(() => {
        return tasks
            .filter(t => !t.completed)
            .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter(t => !filterPriority || t.priority === filterPriority)
            .sort((a, b) => a.order - b.order);
    }, [tasks, searchQuery, filterPriority]);

    const completedTasks = useMemo(() =>
        tasks.filter(t => t.completed).slice(0, 5),
        [tasks]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = tasks.findIndex((t) => t.id === active.id);
            const newIndex = tasks.findIndex((t) => t.id === over.id);
            reorderTasks(arrayMove(tasks, oldIndex, newIndex).map((t, idx) => ({ ...t, order: idx })));
        }
    };

    return (
        <div className={styles.panelContainer}>
            <div className={styles.controls}>
                <div className={styles.searchBar}>
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search missions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className={styles.filters}>
                    <button
                        className={clsx(styles.filterBtn, !filterPriority && styles.activeFilter)}
                        onClick={() => setFilterPriority(null)}
                    >
                        All
                    </button>
                    {['low', 'medium', 'high', 'critical'].map(p => (
                        <button
                            key={p}
                            className={clsx(styles.filterBtn, filterPriority === p && styles.activeFilter)}
                            onClick={() => setFilterPriority(p)}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h3>Active Pipeline</h3>
                        <span className={styles.count}>{filteredTasks.length}</span>
                    </div>
                    <SortableContext
                        items={filteredTasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className={styles.list}>
                            <AnimatePresence mode="popLayout">
                                {filteredTasks.map((task) => (
                                    <SortableTaskItem key={task.id} task={task} />
                                ))}
                            </AnimatePresence>
                            {filteredTasks.length === 0 && (
                                <div className={styles.empty}>
                                    {searchQuery || filterPriority ? 'No tasks match your filters.' : '🎉 All missions completed!'}
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </div>
            </DndContext>

            {completedTasks.length > 0 && (
                <div className={clsx(styles.section, styles.completedSection)}>
                    <div className={styles.sectionHeader}>
                        <h3>Recently Completed</h3>
                    </div>
                    <div className={styles.list}>
                        {completedTasks.map((task) => (
                            <div key={task.id} className={clsx(styles.taskCard, styles.completed, styles.minimal)}>
                                <CheckCircle2 size={16} className={styles.completedIcon} />
                                <span className={styles.taskTitle}>{task.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
