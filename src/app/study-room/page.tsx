"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Video, VideoOff, Mic, MicOff, 
    Settings, X, Search, 
    MessageSquare, UserPlus, Zap,
    Camera, PhoneOff, Monitor,
    ChevronLeft, Grid, Layout,
    Paperclip, Image as ImageIcon,
    Smile, Send, Users, ChevronRight,
    Home, Bell, Mail, Phone, MoreHorizontal,
    Radio, Activity, Globe, Plus, LogOut,
    UserCheck, SendHorizontal, StopCircle,
    AlertCircle, RefreshCw, ShieldAlert, Share2, Hash
} from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { useSocialStore } from '@/store/useSocialStore';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import styles from './StudyRoom.module.css';
import { clsx } from 'clsx';

function StudyRoomContent() {
    const { user } = useAuth();
    const { setPresenceMetadata, friends, fetchFriends, recalculatePresence } = useSocialStore();
    const searchParams = useSearchParams();
    
    // Page State
    const [mounted, setMounted] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(true);
    const [isSharing, setIsSharing] = useState(false);
    const [mediaError, setMediaError] = useState<string | null>(null);
    
    // UI State
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [joinLoading, setJoinLoading] = useState<string | null>(null);

    // Chat State
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // Media Streams
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        setMounted(true);
        fetchFriends();

        // Refresh presence every 10s so the sidebar stays live
        const presencePoll = setInterval(() => {
            recalculatePresence();
        }, 10_000);
        
        // Handle Auto-Join from Invitation
        if (searchParams?.get('autoJoin') === 'true') {
            const timer = setTimeout(() => {
                handleConnectToggle();
            }, 800);
            return () => {
                clearTimeout(timer);
                clearInterval(presencePoll);
                stopAllStreams();
            };
        }

        return () => {
            clearInterval(presencePoll);
            stopAllStreams();
            setPresenceMetadata('available');
        };
    }, [searchParams]);


    // Robust stream attachment
    useEffect(() => {
        const video = localVideoRef.current;
        if (!video) return;

        let streamToAttach: MediaStream | null = null;
        if (isSharing && screenStream) {
            streamToAttach = screenStream;
        } else if (!isCameraOff && activeStream) {
            streamToAttach = activeStream;
        }

        if (video.srcObject !== streamToAttach) {
            video.srcObject = streamToAttach;
        }
    }, [isSharing, screenStream, isCameraOff, activeStream]);

    const stopAllStreams = () => {
        if (activeStream) {
            activeStream.getTracks().forEach(t => t.stop());
        }
        if (screenStream) {
            screenStream.getTracks().forEach(t => t.stop());
        }
        setActiveStream(null);
        setScreenStream(null);
    };

    const handleConnectToggle = async () => {
        if (isConnected) {
            stopAllStreams();
            setIsConnected(false);
            setPresenceMetadata('available');
            setIsCameraOff(true);
            setIsSharing(false);
            setMediaError(null);
        } else {
            setIsConnected(true);
            const rId = searchParams?.get('room') || 'general';
            setPresenceMetadata('focusing', rId);
            await startCamera();
        }
    };

    const startCamera = async () => {
        setMediaError(null);
        try {
            // Attempt to get both, fall back to just camera if audio fails
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720 }, 
                audio: true 
            });
            setActiveStream(stream);
            setIsCameraOff(false);
            setIsMuted(false);
        } catch (err: any) {
            console.error("Camera Error:", err);
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setMediaError("Permission denied. Please allow camera and microphone access in your browser settings to join the session.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setMediaError("No camera or microphone found on your device.");
            } else {
                setMediaError("Failed to access media devices. Check if another app is using your camera.");
            }
            
            setIsConnected(false);
        }
    };

    const toggleCamera = async () => {
        if (!isConnected) {
            setIsConnected(true);
            await startCamera();
            return;
        }
        
        if (isCameraOff) {
            const videoTracks = activeStream?.getVideoTracks();
            if (videoTracks && videoTracks.length > 0 && videoTracks[0].readyState !== 'ended') {
                videoTracks.forEach(t => t.enabled = true);
                setIsCameraOff(false);
            } else {
                await startCamera();
            }
        } else {
            if (activeStream) {
                activeStream.getVideoTracks().forEach(t => t.enabled = false);
            }
            setIsCameraOff(true);
        }
    };

    const toggleMute = () => {
        if (!isConnected) return;
        if (activeStream) {
            const newState = !isMuted;
            activeStream.getAudioTracks().forEach(track => track.enabled = !newState);
            setIsMuted(newState);
        }
    };

    const handleShareScreen = async () => {
        if (!isConnected) {
            setIsConnected(true);
        }

        if (isSharing) {
            if (screenStream) screenStream.getTracks().forEach(t => t.stop());
            setScreenStream(null);
            setIsSharing(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                setScreenStream(stream);
                setIsSharing(true);
                
                stream.getVideoTracks()[0].onended = () => {
                    setIsSharing(false);
                    setScreenStream(null);
                };
            } catch (err: any) {
                if (err.name !== 'NotAllowedError') {
                    console.error("Screen Share Error:", err);
                }
            }
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        const msg = {
            id: Date.now(),
            author: 'You',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: newMessage,
            isYou: true
        };
        setMessages([...messages, msg]);
        setNewMessage('');
    };

    const handleJoinFriend = (friend: any) => {
        if (!friend.currentRoomId) return;
        setJoinLoading(friend.id);
        window.location.href = `/study-room?room=${friend.currentRoomId}&autoJoin=true`;
    };

    if (!mounted) return null;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <button className={styles.backBtn} onClick={() => window.history.back()}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className={styles.titleGroup}>
                        <h1 className={styles.title}>Study Room</h1>
                        <div className={clsx(styles.badge, isConnected && styles.badgeLive)}>
                            <Radio size={12} className={isConnected ? styles.pulse : ''} />
                            {isConnected ? 'SESSION ACTIVE' : 'OFFLINE'}
                        </div>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.presenceBadge} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '12px' }}>
                        <Globe size={14} style={{ color: 'var(--accent-teal)' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{searchParams?.get('room') ? `ROOM: ${searchParams.get('room')}` : 'PUBLIC FOCUS'}</span>
                    </div>
                </div>
            </header>

            {/* Layout */}
            <div className={clsx(styles.mainLayout, !isChatOpen && styles.fullWidthStage)}>
                {/* Discord-like Sidebar */}
                <aside className={styles.discordSidebar}>
                    <div className={styles.sidebarHeader}>
                        <Radio size={14} className={styles.pulse} />
                        <span>Active Channels</span>
                    </div>
                    
                    <div className={styles.channelGroup}>
                        <div className={clsx(styles.channelItem, !searchParams?.get('room') && styles.channelActive)} onClick={() => window.location.href = '/study-room'}>
                            <Hash size={16} />
                            <span># public-focus</span>
                        </div>
                    </div>

                    <div className={styles.sidebarHeader} style={{ marginTop: 20 }}>
                        <Users size={14} />
                        <span>Friend Rooms</span>
                    </div>

                    <div className={styles.channelScrollArea}>
                        {friends.filter(f => f.status === 'focusing').length > 0 ? (
                            friends.filter(f => f.status === 'focusing').map(friend => (
                                <div 
                                    key={friend.id} 
                                    className={clsx(styles.discordChannel, searchParams?.get('room') === friend.currentRoomId && styles.channelActive)}
                                    onClick={() => handleJoinFriend(friend)}
                                >
                                    <div className={styles.discordChannelHeader}>
                                        <Hash size={14} />
                                        <span>@{friend.username}'s Room</span>
                                    </div>
                                    <div className={styles.userUnderChannel}>
                                        <div className={styles.avatarMiniWrapper}>
                                            <img 
                                                src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.username}`} 
                                                className={styles.avatarMini} 
                                                alt="" 
                                            />
                                            <div className={styles.miniIndicatorLive} />
                                        </div>
                                        <span className={styles.miniUsername}>{friend.username}</span>
                                        {joinLoading === friend.id && <RefreshCw size={10} className={styles.spin} style={{ marginLeft: 'auto' }} />}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptySidebar}>
                                <Activity size={24} opacity={0.2} />
                                <p>No friends focusing</p>
                            </div>
                        )}
                    </div>

                    {/* My Status Card */}
                    <div className={styles.myPresenceCard}>
                        <img 
                            src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.username}`} 
                            className={styles.avatarMini} 
                            alt="" 
                        />
                        <div className={styles.myInfoMini}>
                            <span className={styles.myMiniUsername}>{user?.user_metadata?.username || 'user'}</span>
                            <span className={styles.myMiniStatus}>{isConnected ? 'Focusing' : 'Online'}</span>
                        </div>
                        <div className={styles.presenceActions}>
                            <button onClick={toggleMute} className={clsx(isMuted && styles.presenceDanger)}><Mic size={14} /></button>
                            <button onClick={() => window.location.href = '/settings'}><Settings size={14} /></button>
                        </div>
                    </div>
                </aside>

                {/* Stage */}
                <div className={clsx(styles.videoStage, isSharing && styles.sharingOuter, mediaError && styles.errorStage)}>
                    {mediaError ? (
                        <div className={styles.errorOverlay}>
                            <ShieldAlert size={48} color="#ff4d4d" />
                            <h3>Permission Required</h3>
                            <p>{mediaError}</p>
                            <button className={styles.retryBtn} onClick={startCamera}>
                                <RefreshCw size={16} />
                                Retry Connection
                            </button>
                        </div>
                    ) : (!isConnected || (isCameraOff && !isSharing)) ? (
                        <div className={styles.idleOverlay} onClick={handleConnectToggle}>
                            <div className={styles.idleIcon}>
                                {isConnected ? (
                                    <img 
                                        src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.username || 'U'}&background=1a1a1a&color=fff`}
                                        style={{ width: '100%', height: '100%', borderRadius: '50%', padding: 4 }}
                                        alt="" 
                                    />
                                ) : <Zap size={48} color="var(--accent-orange)" opacity={0.6} />}
                            </div>
                        <div className={styles.statusText}>
                                <h2>{isConnected ? `u/${user?.user_metadata?.username || 'agent'}` : 'Focus Lounge'}</h2>
                                <p>{isConnected ? 'Camera is currently off' : 'Select an active channel or start your own'}</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <video 
                                ref={localVideoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className={styles.videoElement} 
                            />
                            {isSharing && (
                                <div className={styles.sharingBanner}>
                                    <Monitor size={14} />
                                    <span>Sharing Screen</span>
                                </div>
                            )}
                        </div>
                    )}

                    {isConnected && !mediaError && (
                        <div className={styles.videoInfo}>
                            <Activity size={14} style={{ color: 'var(--accent-teal)' }} />
                            <span>u/{user?.user_metadata?.username || 'agent'}</span>
                        </div>
                    )}

                    {/* Floating Controls */}
                    <div className={styles.floatingDeck}>
                        <button 
                            className={clsx(styles.deckIconButton, !isCameraOff && styles.activeIcon, isCameraOff && styles.dangerIcon)}
                            onClick={toggleCamera}
                            title={isCameraOff ? "Start Camera" : "Stop Camera"}
                        >
                            {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
                        </button>

                        <button 
                            className={clsx(styles.deckIconButton, isMuted && styles.dangerIcon)}
                            onClick={toggleMute}
                            disabled={!isConnected}
                            title={isMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                        </button>

                        <div className={styles.deckDivider} />

                        <button 
                            className={clsx(styles.deckMainButton, isConnected && styles.deckMainButtonActive)}
                            onClick={handleConnectToggle}
                        >
                            <Zap size={18} fill={isConnected ? "white" : "none"} />
                            {isConnected ? 'Stop Session' : 'Start Session'}
                        </button>

                        <div className={styles.deckDivider} />

                        <button 
                            className={clsx(styles.deckIconButton, isSharing && styles.activeIcon)} 
                            onClick={handleShareScreen}
                            title="Share Screen"
                        >
                            {isSharing ? <StopCircle size={22} /> : <Monitor size={22} />}
                        </button>

                        <button 
                            className={clsx(styles.deckIconButton, isChatOpen && styles.activeIcon)}
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            title="Toggle Chat"
                        >
                            <MessageSquare size={22} />
                        </button>
                    </div>
                </div>

                {/* Chat Panel */}
                <AnimatePresence>
                    {isChatOpen && (
                        <motion.aside 
                            className={styles.chatContainer}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 360 }}
                            exit={{ opacity: 0, width: 0 }}
                        >
                            <div className={styles.chatHeader}>
                                <h3>Session Chat</h3>
                            </div>
                            <div className={styles.chatMessages}>
                                {messages.length === 0 ? (
                                    <div className={styles.emptyChat}>
                                        <MessageSquare size={48} opacity={0.1} />
                                        <p>No messages yet</p>
                                    </div>
                                ) : (
                                    messages.map(msg => (
                                        <div key={msg.id} className={clsx(styles.message, msg.isYou && styles.myMessage)}>
                                            {msg.content}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className={styles.chatFooter}>
                                <div className={styles.chatInputWrapper}>
                                    <input 
                                        type="text" 
                                        className={styles.chatInput} 
                                        placeholder="Type message..." 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <button className={styles.chatSendBtn} onClick={handleSendMessage}>
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function StudyRoomPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Establishing pulse connection...</div>}>
            <StudyRoomContent />
        </Suspense>
    );
}
