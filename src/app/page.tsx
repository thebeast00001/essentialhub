"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Timer,
  LayoutDashboard,
  Search,
  Bell
} from 'lucide-react';
import styles from './page.module.css';
import { useTaskStore } from '@/store/useTaskStore';
import { format } from 'date-fns';
import { StatCard, CommandSection, Skeleton } from '@/components/ui/CommandUI';
import { TaskCommandPanel } from '@/components/dashboard/TaskCommandPanel';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { ProductivityCharts } from '@/components/dashboard/ProductivityCharts';
import { AIInsights } from '@/components/dashboard/AIInsights';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Button } from '@/components/ui/UIComponents';
import { Celebration } from '@/components/ui/Celebration';

export default function CommandCenter() {
  const {
    tasks,
    productivityScore,
    focusTimeToday,
    timerSeconds,
    isTimerRunning,
    startTimer,
    stopTimer,
    tickTimer
  } = useTaskStore();

  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastTaskCount, setLastTaskCount] = useState(0);

  useEffect(() => {
    setIsMounted(true);

    // Check for task completions to trigger celebration
    const completedCount = tasks.filter(t => t.completed).length;
    if (isMounted && completedCount > lastTaskCount && lastTaskCount > 0) {
      setShowCelebration(true);
    }
    setLastTaskCount(completedCount);

    // Timer Tick
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    // Keyboard Shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'n' && !isModalOpen && document.activeElement?.tagName !== 'INPUT') {
        setIsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [tickTimer, isModalOpen]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stats = useMemo(() => {
    const completedToday = tasks.filter(t => t.completed && t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length;
    const pending = tasks.filter(t => !t.completed).length;
    const missed = tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < new Date()).length;

    return { completedToday, pending, missed };
  }, [tasks]);

  if (!isMounted) {
    return (
      <div className={styles.loading}>
        <Skeleton width="100%" height="200px" />
        <div className={styles.loadingGrid}>
          <Skeleton height="400px" />
          <Skeleton height="400px" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className="text-gradient">ESSENTIAL HUB</h1>
          <p className={styles.date}>{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn}><Search size={20} /></button>
            <button className={styles.iconBtn}><Bell size={20} /></button>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className={styles.quickAdd}>
            <Plus size={18} />
            <span>New Task</span>
          </Button>
        </div>
      </header>

      <section className={styles.statGrid}>
        <StatCard
          label="Today's Progress"
          value={stats.completedToday}
          icon={<CheckCircle2 />}
          tendency="up"
          trendValue="12%"
          color="var(--status-success)"
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pending}
          icon={<Clock />}
          color="var(--status-warning)"
        />
        <StatCard
          label="Missed Deadlines"
          value={stats.missed}
          icon={<AlertCircle />}
          color="var(--status-danger)"
        />
        <StatCard
          label="Productivity Score"
          value={productivityScore}
          suffix="%"
          icon={<Zap />}
          tendency="up"
          trendValue="5%"
          color="var(--accent-primary)"
        />
        <StatCard
          label="Timer Sessions"
          value={focusTimeToday}
          suffix="m"
          icon={<Timer />}
          color="var(--status-info)"
        />
      </section>

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          <CommandSection title="Task Pipeline">
            <TaskCommandPanel />
          </CommandSection>

          <CommandSection title="Performance Analytics">
            <ProductivityCharts />
          </CommandSection>
        </div>

        <aside className={styles.rightCol}>
          <CommandSection title="Smart Insights">
            <AIInsights />
          </CommandSection>

          <CommandSection title="Recent Activity">
            <ActivityTimeline />
          </CommandSection>

          <div className={styles.focusCard}>
            <div className={styles.focusHeader}>
              <Timer size={20} />
              <span>Active Timer</span>
            </div>
            <div className={styles.focusTimer}>{formatTime(timerSeconds)}</div>
            <Button
              fullWidth
              variant={isTimerRunning ? 'secondary' : 'primary'}
              onClick={() => isTimerRunning ? stopTimer() : startTimer()}
            >
              {isTimerRunning ? 'Pause Timer' : 'Start Timer'}
            </Button>
            <p className={styles.shortcutHint}>Press <b>N</b> for new task</p>
          </div>
        </aside>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <Celebration
        isVisible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </motion.div>
  );
}
