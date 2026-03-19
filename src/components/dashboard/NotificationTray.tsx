"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Bell, 
    UserPlus, 
    Zap, 
    Check, 
    Trash2,
    MessageSquare,
    Sparkles
} from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { formatDistanceToNow } from 'date-fns';
import styles from './NotificationTray.module.css';
import { clsx } from 'clsx';
import { Button } from '../ui/UIComponents';

import { useRouter } from 'next/navigation';

interface NotificationTrayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationTray: React.FC<NotificationTrayProps> = ({ isOpen, onClose }) => {
    const { pendingRequests, acceptFriendRequest, activities } = useTaskStore();
    const router = useRouter();

    const handleViewAll = () => {
        onClose();
        router.push('/notifications');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div 
                        className={styles.tray}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        <div className={styles.header}>
                            <div className={styles.headerTitle}>
                                <Bell size={20} className={styles.bellIcon} />
                                <h3>Command Inbox</h3>
                            </div>
                            <button onClick={onClose} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.content}>
                            {/* Friend Requests */}
                            {pendingRequests?.length > 0 && (
                                <section className={styles.section}>
                                    <h4 className={styles.sectionLabel}>Priority Alerts</h4>
                                    <div className={styles.list}>
                                        {pendingRequests.map((request: any) => (
                                            <div key={request.id} className={styles.notifCard}>
                                                <div className={styles.avatar}>
                                                    {request.profiles?.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <div className={styles.info}>
                                                    <p><strong>{request.profiles?.full_name || 'Anonymous'}</strong> sent a frequency sync request.</p>
                                                    <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                                                    <div className={styles.actions}>
                                                        <Button size="sm" onClick={() => acceptFriendRequest(request.id)}>Sync</Button>
                                                        <button className={styles.miniBtn}><X size={14} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Recent Activity */}
                            <section className={styles.section}>
                                <h4 className={styles.sectionLabel}>System Logs</h4>
                                <div className={styles.list}>
                                    {activities.length > 0 ? activities.slice(0, 15).map((activity) => (
                                        <div key={activity.id} className={styles.activityItem}>
                                            <div className={clsx(styles.activityIcon, styles[activity.type])}>
                                                <Zap size={14} />
                                            </div>
                                            <div className={styles.info}>
                                                <p>{activity.title}</p>
                                                <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className={styles.empty}>
                                            <Sparkles size={24} />
                                            <p>All quiet in the command center.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className={styles.footer}>
                            <Button fullWidth variant="ghost" onClick={handleViewAll}>
                                View All Logs
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
