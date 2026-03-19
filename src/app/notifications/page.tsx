"use client";

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
    Bell, 
    UserPlus, 
    MessageSquare, 
    Zap, 
    ChevronRight, 
    X,
    Clock,
    Sparkles
} from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import styles from './Notifications.module.css';
import { Button } from '@/components/ui/UIComponents';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
    const { pendingRequests, acceptFriendRequest, activities } = useTaskStore();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, x: -20 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { 
                type: 'spring', 
                stiffness: 100, 
                damping: 15 
            }
        }
    };

    if (!mounted) return null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1 className={styles.title}>Inbox</h1>
                    <div className={styles.badge}>{pendingRequests?.length || 0} New</div>
                </div>
                <p className={styles.subtitle}>Stay updated with your social circle and system alerts.</p>
            </header>

            <motion.div 
                className={styles.content}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Social Requests Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <UserPlus size={18} className={styles.sectionIcon} />
                        <h2>Friend Requests</h2>
                    </div>
                    
                    <div className={styles.list}>
                        {pendingRequests?.length > 0 ? pendingRequests.map((request: any) => (
                            <motion.div 
                                key={request.id} 
                                className={styles.notificationCard}
                                variants={itemVariants}
                                whileHover={{ scale: 1.01 }}
                            >
                                <div className={styles.avatar}>
                                    {request.profiles?.full_name?.charAt(0) || 'U'}
                                </div>
                                <div className={styles.notifInfo}>
                                    <p className={styles.notifText}>
                                        <strong>{request.profiles?.full_name || 'Someone'}</strong> sent you a friend request.
                                    </p>
                                    <span className={styles.time}>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                                </div>
                                <div className={styles.actions}>
                                    <Button size="sm" onClick={() => acceptFriendRequest(request.id)}>Accept</Button>
                                    <button className={styles.closeBtn}><X size={16} /></button>
                                </div>
                            </motion.div>
                        )) : (
                            <div className={styles.emptyState}>
                                <Sparkles size={32} className={styles.emptyIcon} />
                                <p>No new friend requests. Expand your network!</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* System & Activity Alerts */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Bell size={18} className={styles.sectionIcon} />
                        <h2>Recent Updates</h2>
                    </div>

                    <div className={styles.list}>
                        {activities.slice(0, 10).map((activity) => (
                            <motion.div 
                                key={activity.id} 
                                className={styles.notificationCard}
                                variants={itemVariants}
                            >
                                <div className={clsx(styles.activityIcon, styles[activity.type])}>
                                    <Zap size={14} />
                                </div>
                                <div className={styles.notifInfo}>
                                    <p className={styles.notifText}>{activity.title}</p>
                                    <span className={styles.time}>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                                </div>
                                <ChevronRight size={16} className={styles.chevron} />
                            </motion.div>
                        ))}
                    </div>
                </section>
            </motion.div>
        </div>
    );
}

// Simple clsx replacement for this file
function clsx(...args: any[]) {
    return args.filter(Boolean).join(' ');
}
