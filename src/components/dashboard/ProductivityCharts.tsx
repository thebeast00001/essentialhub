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

const MOCK_LINE_DATA = [
    { name: 'Mon', tasks: 4, productivity: 60 },
    { name: 'Tue', tasks: 7, productivity: 85 },
    { name: 'Wed', tasks: 5, productivity: 72 },
    { name: 'Thu', tasks: 8, productivity: 90 },
    { name: 'Fri', tasks: 6, productivity: 78 },
    { name: 'Sat', tasks: 3, productivity: 40 },
    { name: 'Sun', tasks: 2, productivity: 30 },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export const ProductivityCharts = () => {
    const tasks = useTaskStore((state) => state.tasks);

    const categoryData = [
        { name: 'Design', value: tasks.filter(t => t.tags.includes('Design')).length },
        { name: 'Development', value: tasks.filter(t => t.tags.includes('Development')).length },
        { name: 'Planning', value: tasks.filter(t => t.tags.includes('Planning') || t.tags.includes('General')).length },
    ].filter(d => d.value > 0);

    return (
        <div className={styles.container}>
            <div className={styles.chartWrapper}>
                <h3 className={styles.chartTitle}>Efficiency Trend</h3>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <AreaChart data={MOCK_LINE_DATA}>
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
