"use client";

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useTaskStore } from '@/store/useTaskStore';
import styles from './ProductivityCharts.module.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export const ProductivityCharts = () => {
    const { tasks, focusSessions } = useTaskStore();

    const efficiencyData = React.useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days.map((day, i) => {
            const sessions = focusSessions.filter(s => new Date(s.timestamp).getDay() === i);
            const focus = sessions.reduce((acc, s) => acc + s.duration, 0);
            const compTasks = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt).getDay() === i).length;
            return {
                name: day,
                tasks: compTasks,
                productivity: Math.min(100, (focus / 120) * 100)
            };
        });
    }, [tasks, focusSessions]);

    const categoryData = React.useMemo(() => {
        const categories = ['Design', 'Development', 'Planning', 'General'];
        return categories.map(cat => ({
            name: cat,
            value: tasks.filter(t => t.tags.includes(cat)).length
        })).filter(d => d.value > 0);
    }, [tasks]);

    return (
        <div className={styles.container}>
            <div className={styles.chartWrapper}>
                <h3 className={styles.chartTitle}>Efficiency Trend</h3>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <AreaChart data={efficiencyData}>
                            <defs>
                                <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '12px',
                                    boxShadow: 'var(--shadow-lg)'
                                }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="productivity"
                                stroke="#6366f1"
                                fillOpacity={1}
                                fill="url(#colorProd)"
                                strokeWidth={3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={styles.chartWrapper}>
                <h3 className={styles.chartTitle}>Distribution</h3>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={categoryData.length > 0 ? categoryData : [{ name: 'None', value: 1 }]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
