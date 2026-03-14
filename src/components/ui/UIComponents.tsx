"use client";

import React from 'react';
import styles from './UI.module.css';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth,
    className,
    ...props
}) => {
    return (
        <button
            className={clsx(
                styles.button,
                styles[variant],
                styles[size],
                fullWidth && styles.fullWidth,
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hoverable }) => {
    return (
        <div className={clsx('glass-card', styles.card, hoverable && styles.hoverable, className)}>
            {children}
        </div>
    );
};

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'low' | 'medium' | 'high' | 'critical' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
    return (
        <span className={clsx(styles.badge, styles[`badge-${variant}`])}>
            {children}
        </span>
    );
};
