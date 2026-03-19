"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  LayoutDashboard,
  Search,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Calendar as CalendarIcon,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import styles from './page.module.css';
import { useAuth } from '@/hooks/useAuth';
import { useTaskStore } from '@/store/useTaskStore';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { StatCard, CommandSection, Skeleton } from '@/components/ui/CommandUI';
import { TaskCommandPanel } from '@/components/dashboard/TaskCommandPanel';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { ProductivityCharts } from '@/components/dashboard/ProductivityCharts';
import { AIInsights } from '@/components/dashboard/AIInsights';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Button } from '@/components/ui/UIComponents';
import { Celebration } from '@/components/ui/Celebration';
import { NotificationTray } from '@/components/dashboard/NotificationTray';
import { AICommandCenter } from '@/components/dashboard/AICommandCenter';

export default function CommandCenter() {
  const {
    tasks,
    habits,
    activities,
    focusSessions,
    productivityScore,
    focusTimeToday,
    timerSeconds,
    isTimerRunning,
    startTimer,
    stopTimer,
    tickTimer,
    pendingRequests
  } = useTaskStore();

  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastTaskCount, setLastTaskCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [todayDate, setTodayDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const timer = setInterval(() => {
      const now = format(new Date(), 'yyyy-MM-dd');
      if (now !== todayDate) setTodayDate(now);
    }, 60000);
    return () => clearInterval(timer);
  }, [todayDate]);

  const hasNotifications = pendingRequests?.length > 0;

  // Animation Variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        type: 'spring', 
        stiffness: 100, 
        damping: 15 
      }
    }
  };

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
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const completedToday = tasks.filter(t => t.completed && t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === todayStr).length;
    const pending = tasks.filter(t => !t.completed && format(new Date(t.createdAt), 'yyyy-MM-dd') === todayStr).length;
    const missed = tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < new Date()).length;

    return { completedToday, pending, missed };
  }, [tasks, todayDate]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const isSearchMatch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.priority.toLowerCase().includes(searchQuery.toLowerCase());
      const isToday = format(new Date(t.createdAt), 'yyyy-MM-dd') === todayDate;
      return isSearchMatch && isToday;
    }).slice(0, 5);
  }, [tasks, searchQuery, todayDate]);

  const efficiencyTrend = useMemo(() => {
    // Last 7 days real focus time 
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const daySeconds = focusSessions
        .filter(s => format(new Date(s.timestamp), 'yyyy-MM-dd') === dateStr)
        .reduce((acc, s) => acc + (s.duration * 60), 0);
      
      return Math.min(10, (daySeconds / 7200) * 10); // Scale to 10 based on a 2hr target
    });
  }, [focusSessions]);

  const { user } = useAuth();
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  if (!isMounted) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingTop}>
          <Skeleton width="60%" height="40px" />
          <Skeleton width="120px" height="40px" />
        </div>
        <div className={styles.loadingHero}>
          <Skeleton width="100%" height="150px" />
        </div>
        <div className={styles.loadingGrid}>
          <Skeleton height="600px" />
          <Skeleton height="600px" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className={styles.container}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Search & Actions Bar */}
      <motion.div className={styles.topBar} variants={itemVariants}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search habits, tasks, documents..." 
            className={styles.topSearch}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className={styles.searchCategories}>
            <span className={clsx(styles.categoryTag, !searchQuery && styles.activeTag)} onClick={() => setSearchQuery('')}>All</span>
            <span className={clsx(styles.categoryTag, searchQuery === 'High' && styles.activeTag)} onClick={() => setSearchQuery('High')}>High</span>
            <span className={clsx(styles.categoryTag, searchQuery === 'Daily' && styles.activeTag)} onClick={() => setSearchQuery('Daily')}>Daily</span>
          </div>
        </div>
        <div className={styles.topActions}>
          <button 
            className={styles.notificationBtn} 
            onClick={() => setIsNotifOpen(true)}
            aria-label="Open Notifications"
          >
            <Bell size={20} />
            {hasNotifications && <span className={styles.notifDot} />}
          </button>
        </div>
      </motion.div>

      <div className={styles.dashboardLayout}>
        <div className={styles.mainContent}>
          {/* Hero Greeting */}
          <motion.div className={styles.heroSection} variants={itemVariants}>
            <div className={styles.heroMain}>
              <h1 className={styles.greetingTitle}>
                {greeting}, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Zenith User'}
              </h1>
              <div className={styles.dailyMantra}>
                <Sparkles size={16} className={styles.mantraIcon} />
                <span>"Focus on progress, not perfection. Today is a fresh canvas."</span>
              </div>
            </div>
            <div className={styles.heroActions}>
              <Button onClick={() => window.location.href='/focus'} className={styles.quickFocusBtn}>
                <Zap size={18} />
                Launch Timer
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats Grid */}
          <motion.section className={styles.statCardsGrid} variants={itemVariants}>
            <motion.div 
              className={clsx(styles.dashboardStatCard, styles.yellowCard)}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardLabel}>Efficiency:</span>
              </div>
              <div className={styles.cardLargeValue}>{productivityScore}%</div>
              <p className={styles.cardSmallInfo}>Based on task velocity</p>
              <div className={styles.cardMiniChart}>
                {efficiencyTrend.map((h, i) => (
                  <div key={i} className={styles.chartBar} style={{ height: `${h * 10}%` }} />
                ))}
              </div>
            </motion.div>
            <motion.div 
              className={clsx(styles.dashboardStatCard, styles.pinkCard)}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardLabel}>Session Progress:</span>
              </div>
              <div className={styles.cardLargeValue}>{formatTime(timerSeconds)}</div>
              <p className={styles.cardSmallInfo}>{isTimerRunning ? 'Timer Active' : 'Ready to start'}</p>
              <div className={styles.chartLine}>
                <svg viewBox="0 0 100 40" className={styles.sparkLine}>
                  <path d={`M0 35 Q 25 ${35 - (focusTimeToday % 30)}, 50 ${35 - (focusTimeToday % 25)} T 100 15`} fill="none" stroke="currentColor" strokeWidth="3" />
                  <circle cx="100" cy="15" r="3" fill="currentColor" />
                </svg>
              </div>
            </motion.div>

            <motion.div 
              className={clsx(styles.dashboardStatCard, styles.greenCard)}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardLabel}>Focus Today:</span>
              </div>
              <div className={styles.cardLargeValue}>{focusTimeToday}m</div>
              <p className={styles.cardSmallInfo}>Timer accumulated</p>
              <div className={styles.cardShapeGfx} />
            </motion.div>

            <motion.div 
              className={clsx(styles.dashboardStatCard, styles.blueCard)}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardLabel}>Batch Progress:</span>
              </div>
              <div className={styles.cardLargeValue}>{stats.completedToday}/{tasks.length}</div>
              <p className={styles.cardSmallInfo}>{Math.round((stats.completedToday / (tasks.length || 1)) * 100)}% Complete</p>
              <div className={styles.cardStarGfx} />
            </motion.div>
          </motion.section>

          {/* Activity split view */}
          <motion.div className={styles.splitSection} variants={itemVariants}>
            <div className={styles.taskSide}>
              <div className={styles.sectionHeading}>
                <h2>Zenith AI Assistant</h2>
                <div className={styles.aiBadge}>
                  <Sparkles size={14} />
                  Live Assistant
                </div>
              </div>
              <div className={styles.commandCenterCard} style={{ padding: 0 }}>
                <AICommandCenter />
              </div>
            </div>

            <div className={styles.detailSide}>
              <div className={styles.sectionHeading}>
                <h2>Strategic Command</h2>
                <div className={styles.aiBadge}>
                  <Sparkles size={14} />
                  Zenith AI
                </div>
              </div>
              <div className={styles.commandCenterCard}>
                <div className={styles.commandSection}>
                  <h4 className={styles.subLabel}>PRIORITY FOCUS</h4>
                  <div className={styles.aiSuggestion}>
                    <div className={styles.suggestionTitle}>
                      <Zap size={14} />
                      Next Critical Task
                    </div>
                    <p className={styles.suggestionText}>
                      Based on your deadline for <strong>"{tasks.find(t => !t.completed)?.title || 'Goal Setting'}"</strong>, we suggest starting a 25m Pomodoro now to maintain your streak.
                    </p>
                  </div>
                </div>
                
                <div className={styles.commandSection}>
                  <h4 className={styles.subLabel}>WORKFLOW OPTIMIZATION</h4>
                  <AIInsights />
                </div>

                <div className={styles.commandQuickActions}>
                  <Button variant="ghost" size="sm" onClick={() => startTimer()}>Start Timer</Button>
                  <Button variant="ghost" size="sm">Review Goals</Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <motion.div className={styles.sidebarSection} variants={itemVariants}>
          <div className={styles.stickySide}>
            <div className={styles.calendarControl}>
              <div className={styles.calMonthNav}>
                <button className={styles.calToggleBtn}><ChevronLeft size={16} /></button>
                <div className={styles.currentMonthName}>{format(new Date(), 'MMMM')}</div>
                <button className={styles.calToggleBtn}><ChevronRight size={16} /></button>
              </div>
              <div className={styles.miniCalGrid}>
                {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(day => (
                  <div key={day} className={styles.miniCalHead}>{day}</div>
                ))}
                {Array.from({ length: 31 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={clsx(
                      styles.miniCalDay, 
                      i + 1 === new Date().getDate() && styles.activeMiniDay,
                      // Highlight days with tasks
                      tasks.some(t => t.deadline && new Date(t.deadline).getDate() === i + 1) && styles.hasTasksDay
                    )}
                    onClick={() => setIsModalOpen(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <Button fullWidth onClick={() => setIsModalOpen(true)} className={styles.addEventBtn}>
                <Plus size={18} />
                Add event
              </Button>
              <div className={styles.calFooter}>
                <button className={styles.roundActionBtn} onClick={() => window.location.reload()}><RefreshCcw size={16} /></button>
                <Link href="/schedule" className={styles.roundActionBtn}><CalendarIcon size={16} /></Link>
              </div>
            </div>

            <div className={styles.timelineSection}>
              <div className={styles.sectionHeading}>
                <h3>{format(new Date(), 'MMMM d')}</h3>
                <div className={styles.timelineTabs}>
                  <button className={styles.activeTab}>Timeline</button>
                  <Link href="/insights" className={styles.inactiveTab}>All</Link>
                </div>
              </div>
              <div className={styles.timelineScroll}>
                <ActivityTimeline limit={5} />
              </div>
              <Link href="/insights">
                <Button fullWidth variant="secondary" className={styles.viewDetailsBtn}>
                  View all activity
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <NotificationTray 
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />

      <Celebration
        isVisible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </motion.div>
  );
}
