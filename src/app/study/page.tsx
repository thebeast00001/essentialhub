"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, PhoneOff,
    Volume2, VolumeX, Settings, UserPlus,
    Users, Activity, Headphones, Clock, Zap, ChevronDown, Hand,
    Smile, MessageSquare, MoreVertical, Maximize, Minimize, WifiHigh, Pin, Send,
    Search, X, Check, Loader2
} from 'lucide-react';
import styles from './Study.module.css';
import { clsx } from 'clsx';
import { useTaskStore } from '@/store/useTaskStore';
import { supabase } from '@/lib/supabase';
import { useAudioLevel } from '@/hooks/useAudioLevel';

/* ─── Helpers ─── */
const fmt = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const getProminentColor = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 16; canvas.height = 16;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return resolve("#1a1b1e");
            ctx.drawImage(img, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            let colors: string[] = [];
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i]; const g = data[i+1]; const b = data[i+2];
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                // Exclude very bright or very dark or very gray colors
                const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                if (brightness > 30 && brightness < 220 && saturation > 15) {
                    colors.push(`rgb(${r},${g},${b})`);
                }
            }
            if (colors.length === 0) return resolve("#1a1b1e");
            // Simple frequency pick or just the first valid vibrant one
            const mid = colors[Math.floor(colors.length / 2)];
            // Extract components for darkening
            const matches = mid.match(/\d+/g);
            if (matches) {
                const r = parseInt(matches[0]), g = parseInt(matches[1]), b = parseInt(matches[2]);
                resolve(`rgb(${Math.floor(r * 0.4 + 5)}, ${Math.floor(g * 0.4 + 5)}, ${Math.floor(b * 0.4 + 5)})`);
            } else {
                resolve("#1a1b1e");
            }
        };
        img.onerror = () => resolve("#1a1b1e");
    });
};

/* ════════════════════════════════════════════════════
   VideoTile
   ════════════════════════════════════════════════════ */
interface VideoTileProps { stream: MediaStream | null; className?: string; mirror?: boolean; style?: React.CSSProperties; }
function VideoTile({ stream, className, mirror, style }: VideoTileProps) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const v = ref.current; if (!v) return;
        if (v.srcObject !== stream) {
            v.srcObject = stream;
        }
        if (stream && stream.active) {
            const playVideo = async () => {
                try {
                    await v.play();
                } catch (err) {
                    console.log('Video play failed, retrying...', err);
                }
            };
            playVideo();
        }
    }, [stream]);
    return <video ref={ref} autoPlay playsInline muted className={className}
        style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            backgroundColor: '#000',
            ...style,
            ...(mirror ? { transform: 'scaleX(-1)' } : {}) 
        }} />;
}


/* ════════════════════════════════════════════════════
   ActionCard Component
   ════════════════════════════════════════════════════ */
function ActionCard({ icon, title, sub, color, bg, onClick, active }: any) {
    return (
        <motion.button 
            className={clsx(styles.actionCard, active && styles.activeAction)} 
            onClick={onClick}
            whileHover={{ y: -4, backgroundColor: bg }}
            whileTap={{ scale: 0.98 }}
        >
            <div className={styles.actionIcon} style={{ color, backgroundColor: bg }}>
                {icon}
            </div>
            <div className={styles.actionText}>
                <span className={styles.actionTitle}>{title}</span>
                <span className={styles.actionSub}>{sub}</span>
            </div>
        </motion.button>
    );
}

/* ════════════════════════════════════════════════════
   AvatarDisplay Helper
   ════════════════════════════════════════════════════ */
function AvatarDisplay({ name, avatarUrl, size = 40 }: { name: string, avatarUrl?: string, size?: number }) {
    if (avatarUrl) return <img src={avatarUrl} alt="" className={styles.avatarImg} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
    return (
        <div className={styles.avatarInitial} style={{ width: size, height: size, borderRadius: '50%', background: '#5865f2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
            {name[0]?.toUpperCase()}
        </div>
    );
}

/* ════════════════════════════════════════════════════
   CtrlBtn Helper
   ════════════════════════════════════════════════════ */
function CtrlBtn({ children, onClick, active, danger, label }: any) {
    return (
        <div className={styles.ctrlBtnWrapper}>
            <button 
                className={clsx(styles.ctrlBtn, active && styles.active, danger && styles.danger)}
                onClick={onClick}
                title={label}
            >
                {children}
            </button>
        </div>
    );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════ */
export default function StudyRoomPage() {
    const { user } = useUser();
    const { addActivity, friends, fetchFriends, inviteToStudyRoom } = useTaskStore();

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteSearch,    setInviteSearch]    = useState('');
    const [invitingIds,     setInvitingIds]     = useState<string[]>([]);

    const [hasJoined,       setHasJoined]       = useState(false);
    const [isMicOn,         setIsMicOn]         = useState(true);
    const [isVideoOn,       setIsVideoOn]       = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isDeafened,      setIsDeafened]      = useState(false);
    const [isHandRaised,    setIsHandRaised]    = useState(false);
    const [sessionSecs,     setSessionSecs]     = useState(0);

    const [previewStream,   setPreviewStream]   = useState<MediaStream | null>(null);
    const [previewMicOn,    setPreviewMicOn]    = useState(true);
    const [previewVideoOn,  setPreviewVideoOn]  = useState(false);

    const [videoStream,     setVideoStream]     = useState<MediaStream | null>(null);
    const [screenStream,    setScreenStream]    = useState<MediaStream | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activePanel, setActivePanel] = useState<'participants' | 'chat' | 'settings' | null>(null);
    const [chatMessage, setChatMessage] = useState('');
    const [messages, setMessages] = useState<{id: string, name: string, content: string, time: string}[]>([]);
    const [activeReactions, setActiveReactions] = useState<{id: string, emoji: string}[]>([]);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [participants,    setParticipants]    = useState<any[]>([]);
    const [remoteStreams,   setRemoteStreams]   = useState<Record<string, MediaStream>>({});
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});
    const [lastSync,        setLastSync]        = useState(0);
    const [isFocusMode,     setIsFocusMode]     = useState(false);
    const [dominantColors,  setDominantColors]  = useState<Record<string, { color: string, url: string }>>({});
    const [ambientSound,    setAmbientSound]    = useState<string | null>(null);
    const [roomTimer,       setRoomTimer]       = useState<{ timeLeft: number, type: 'focus' | 'break', isActive: boolean }>({ timeLeft: 1500, type: 'focus', isActive: false });

    const peers = useRef<Record<string, RTCPeerConnection>>({});
    const presenceChannel = useRef<any>(null);
    const participantsRef = useRef<any[]>([]);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    useEffect(() => {
        videoStreamRef.current = videoStream;
    }, [videoStream]);

    useEffect(() => {
        screenStreamRef.current = screenStream;
    }, [screenStream]);

    useEffect(() => {
        const updateColors = async () => {
            for (const p of participants) {
                const uId = p.user_id;
                const url = uId === user?.id ? user?.imageUrl : p.avatar_url;
                if (url && dominantColors[uId]?.url !== url) {
                    try {
                        const color = await getProminentColor(url);
                        setDominantColors(prev => ({ ...prev, [uId]: { color, url } }));
                    } catch (e) {
                        console.error("Color extraction failed", e);
                    }
                }
            }
        };
        updateColors();
    }, [participants, user?.imageUrl]);

    const { level: localVolume, isSpeaking: isLocalSpeaking } = useAudioLevel(videoStream);

    const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    /* Presence Sync */
    useEffect(() => {
        if (!hasJoined || !user) return;

        const channel = supabase.channel('room:general', {
            config: { presence: { key: user.id } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const members = Object.entries(state).map(([key, val]: [string, any]) => ({
                    id: key,
                    ...val[0]
                }));
                setParticipants(members);
            })
            .on('presence', { event: 'join' } as any, ({ key }: any) => {
                if (key === user.id) console.log('You joined the room');
            })
            .on('broadcast', { event: 'chat' }, ({ payload }: any) => {
                setMessages(prev => [...prev, payload]);
            })
            .on('broadcast', { event: 'reaction' }, ({ payload }: any) => {
                const id = Math.random().toString(36).substr(2, 9);
                setActiveReactions(prev => [...prev, { id, emoji: payload.emoji }]);
                setTimeout(() => {
                    setActiveReactions(prev => prev.filter(r => (r as any).id !== id));
                }, 3000);
            })
            .on('broadcast', { event: 'timer-sync' }, ({ payload }: any) => {
                setRoomTimer(payload);
            })
            .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }: any) => {
                if (payload.to !== user.id) return;
                const { from, type, data, metadata } = payload;
                const pc = peers.current[from] || createPeer(from);
                const polite = user.id < from;

                if (metadata) {
                    if (!remoteStreamTypes.current[from]) remoteStreamTypes.current[from] = {};
                    if (metadata.camStreamId) remoteStreamTypes.current[from][metadata.camStreamId] = 'camera';
                    if (metadata.screenStreamId) remoteStreamTypes.current[from][metadata.screenStreamId] = 'screen';
                }

                try {
                    if (type === 'offer') {
                        const offerCollision = makingOffer.current[from] || pc.signalingState !== 'stable';
                        ignoreOffer.current[from] = !polite && offerCollision;
                        if (ignoreOffer.current[from]) {
                            console.log('WebRTC: Ignoring offer (glare protection)');
                            return;
                        }

                        await pc.setRemoteDescription(new RTCSessionDescription(data));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        presenceChannel.current?.send({
                            type: 'broadcast',
                            event: 'webrtc-signal',
                            payload: { 
                                to: from, 
                                from: user.id, 
                                type: 'answer', 
                                data: answer,
                                metadata: {
                                    camStreamId: videoStreamRef.current?.id,
                                    screenStreamId: screenStreamRef.current?.id
                                }
                            }
                        });
                    } else if (type === 'answer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(data));
                    } else if (type === 'candidate') {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(data));
                        } catch (err) {
                            if (!ignoreOffer.current[from]) throw err;
                        }
                    }
                } catch (err) {
                    console.error('WebRTC signal processing error:', err);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user.id,
                        username: user.username || user.firstName || 'User',
                        avatar_url: user.imageUrl,
                        is_mic_on: isMicOn,
                        is_video_on: isVideoOn,
                        is_speaking: isLocalSpeaking,
                        is_screen_sharing: isScreenSharing,
                        is_hand_raised: isHandRaised,
                        cam_stream_id: videoStream?.id || null,
                        screen_stream_id: screenStream?.id || null,
                        joined_at: new Date().toISOString()
                    });
                }
            });

        presenceChannel.current = channel;

        return () => {
            channel.unsubscribe();
        };
    }, [hasJoined, user?.id]);

    // Update presence when local toggles change
    useEffect(() => {
        if (presenceChannel.current && hasJoined) {
            presenceChannel.current.track({
                user_id: user?.id,
                username: user?.username || user?.firstName || 'User',
                avatar_url: user?.imageUrl,
                is_mic_on: isMicOn,
                is_video_on: isVideoOn,
                is_speaking: isLocalSpeaking,
                is_screen_sharing: isScreenSharing,
                is_hand_raised: isHandRaised,
                cam_stream_id: videoStream?.id,
                screen_stream_id: screenStream?.id,
                joined_at: new Date().toISOString()
            });
        }
    }, [isMicOn, isVideoOn, isScreenSharing, isHandRaised, hasJoined, user?.id, user?.imageUrl, user?.username, videoStream?.id, screenStream?.id, isLocalSpeaking]);

    // WebRTC helper refs
    const makingOffer = useRef<Record<string, boolean>>({});
    const ignoreOffer = useRef<Record<string, boolean>>({});
    const remoteStreamTypes = useRef<Record<string, Record<string, 'camera' | 'screen'>>>({});

    // WebRTC helper
    const createPeer = (targetId: string) => {
        if (peers.current[targetId]) return peers.current[targetId];

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peers.current[targetId] = pc;
        const polite = user?.id ? user.id < targetId : false;

        if (videoStream) {
            videoStream.getTracks().forEach(track => pc.addTrack(track, videoStream));
        }
        if (screenStream) {
            screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && presenceChannel.current) {
                presenceChannel.current.send({
                    type: 'broadcast',
                    event: 'webrtc-signal',
                    payload: { to: targetId, from: user?.id, type: 'candidate', data: e.candidate }
                });
            }
        };

        pc.onnegotiationneeded = async () => {
            try {
                makingOffer.current[targetId] = true;
                const offer = await pc.createOffer();
                if (pc.signalingState !== 'stable') return;
                await pc.setLocalDescription(offer);
                
                presenceChannel.current?.send({
                    type: 'broadcast',
                    event: 'webrtc-signal',
                    payload: { 
                        to: targetId, 
                        from: user?.id, 
                        type: 'offer', 
                        data: pc.localDescription,
                        metadata: {
                            camStreamId: videoStreamRef.current?.id,
                            screenStreamId: screenStreamRef.current?.id
                        }
                    }
                });
            } catch (err) {
                console.error('Negotiation error:', err);
            } finally {
                makingOffer.current[targetId] = false;
            }
        };

        pc.ontrack = (e) => {
            const stream = e.streams[0];
            if (!stream) return;

            const pType = remoteStreamTypes.current[targetId]?.[stream.id];
            const latestParticipants = participantsRef.current;
            const p = latestParticipants.find(part => part.user_id === targetId);
            
            console.log('WebRTC: Received', e.track.kind, 'from', targetId, 'Stream:', stream.id, 'Meta:', pType, 'PresenceCam:', p?.cam_stream_id, 'PresenceScreen:', p?.screen_stream_id);

            if (e.track.kind === 'video') {
                const isScreen = pType === 'screen' || (p && p.screen_stream_id === stream.id) || (p?.is_screen_sharing && !p.is_video_on);
                
                if (isScreen) {
                    console.log('WebRTC: Mapping to Screen Stream for', targetId);
                    setRemoteScreenStreams(prev => ({ ...prev, [targetId]: stream }));
                } else {
                    console.log('WebRTC: Mapping to Camera Stream for', targetId);
                    setRemoteStreams(prev => ({ ...prev, [targetId]: stream }));
                }
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                pc.close();
                delete peers.current[targetId];
                setRemoteStreams(prev => {
                    const next = { ...prev };
                    delete next[targetId];
                    return next;
                });
                setRemoteScreenStreams(prev => {
                    const next = { ...prev };
                    delete next[targetId];
                    return next;
                });
            }
        };

        return pc;
    };

    // Auto-initiate WebRTC connections
    useEffect(() => {
        if (!hasJoined || !user) return;
        
        participants.forEach(p => {
            if (p.user_id !== user.id && !peers.current[p.user_id]) {
                // Initialize peer connection - negotiation will be triggered by onnegotiationneeded
                createPeer(p.user_id);
            }
        });

        const currentIds = participants.map(p => p.user_id);
        Object.keys(peers.current).forEach(id => {
            if (!currentIds.includes(id)) {
                peers.current[id].close();
                delete peers.current[id];
                setRemoteStreams(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                setRemoteScreenStreams(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }
        });
    }, [participants, hasJoined, user?.id]);

    // Update tracks for existing peers
    useEffect(() => {
        Object.entries(peers.current).forEach(([id, pc]) => {
            if (pc.signalingState === 'closed') return;
            const senders = pc.getSenders();
            
            // Camera Stream
            const camTrack = videoStream?.getVideoTracks()[0] || null;
            const micTrack = videoStream?.getAudioTracks()[0] || null;
            
            // Find/Replace Camera
            const camSender = senders.find(s => s.track?.kind === 'video' && remoteStreamTypes.current[id]?.[s.track?.id || ''] !== 'screen');
            if (camSender) {
                if (camSender.track !== camTrack) camSender.replaceTrack(camTrack);
            } else if (camTrack) {
                pc.addTrack(camTrack, videoStream!);
            }

            // Find/Replace Mic
            const micSender = senders.find(s => s.track?.kind === 'audio');
            if (micSender) {
                if (micSender.track !== micTrack) micSender.replaceTrack(micTrack);
            } else if (micTrack) {
                pc.addTrack(micTrack, videoStream!);
            }
            
            // Screen Stream
            const screenTrack = screenStream?.getVideoTracks()[0] || null;
            const screenSender = senders.find(s => s.track?.kind === 'video' && (remoteStreamTypes.current[id]?.[s.track?.id || ''] === 'screen' || s.track?.id === screenStream?.getVideoTracks()[0]?.id));
            if (screenSender) {
                if (screenSender.track !== screenTrack) screenSender.replaceTrack(screenTrack);
            } else if (screenTrack) {
                const s = pc.addTrack(screenTrack, screenStream!);
                // Boost quality and reduce lag
                setTimeout(async () => {
                    try {
                        const params = s.getParameters();
                        if (!params.encodings) (params as any).encodings = [{}];
                        params.encodings[0].maxBitrate = 4000000;
                        params.encodings[0].maxFramerate = 30;
                        (params as any).degradationPreference = 'maintain-framerate';
                        await s.setParameters(params);
                    } catch (e) { /* ignore */ }
                }, 100);
            }
        });
    }, [videoStream, screenStream]);

    const triggerReaction = (emoji: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setActiveReactions(prev => [...prev, { id, emoji }]);
        setShowReactionPicker(false);
        
        if (presenceChannel.current) {
            presenceChannel.current.send({
                type: 'broadcast',
                event: 'reaction',
                payload: { emoji, from: user?.username }
            });
        }

        setTimeout(() => {
            setActiveReactions(prev => prev.filter(r => r.id !== id));
        }, 3000);
    };

    const handleSendMessage = () => {
        if (!chatMessage.trim()) return;
        const newMessage = {
            id: Math.random().toString(36).substr(2, 9),
            name: user?.username || user?.firstName || 'You',
            content: chatMessage.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        if (presenceChannel.current) {
            presenceChannel.current.send({
                type: 'broadcast',
                event: 'chat',
                payload: newMessage
            });
        }

        setMessages(prev => [...prev, newMessage]);
        setChatMessage('');
    };

    const handleSendInvite = async (friendId: string) => {
        try {
            setInvitingIds(prev => [...prev, friendId]);
            await inviteToStudyRoom(friendId, 'general');
            setTimeout(() => {
                setInvitingIds(prev => prev.filter(id => id !== friendId));
            }, 2000);
        } catch (err) {
            console.error(err);
            setInvitingIds(prev => prev.filter(id => id !== friendId));
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = (element?: HTMLElement | null) => {
        const target = element || stageRef.current;
        if (!target) return;

        if (!document.fullscreenElement) {
            target.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen().catch(err => console.log(err));
        }
    };

    /* timer */
    useEffect(() => {
        if (hasJoined) timerRef.current = setInterval(() => setSessionSecs(s => s + 1), 1000);
        else { if (timerRef.current) clearInterval(timerRef.current); setSessionSecs(0); }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [hasJoined]);

    /* Shared Room Timer Logic */
    useEffect(() => {
        let interval: any;
        if (roomTimer.isActive && roomTimer.timeLeft > 0) {
            interval = setInterval(() => {
                setRoomTimer(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [roomTimer.isActive, roomTimer.timeLeft]);

    const toggleRoomTimer = () => {
        const nextState = { ...roomTimer, isActive: !roomTimer.isActive };
        setRoomTimer(nextState);
        presenceChannel.current?.send({
            type: 'broadcast',
            event: 'timer-sync',
            payload: nextState
        });
    };

    const resetRoomTimer = (type: 'focus' | 'break' = 'focus') => {
        const nextState = { 
            timeLeft: type === 'focus' ? 1500 : 300, 
            type, 
            isActive: false 
        };
        setRoomTimer(nextState);
        presenceChannel.current?.send({
            type: 'broadcast',
            event: 'timer-sync',
            payload: nextState
        });
    };

    /* preview cam */
    const startPreview = useCallback(async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, 
                audio: false 
            });
            setPreviewStream(s); setPreviewVideoOn(true);
        } catch { setPreviewVideoOn(false); }
    }, []);
    const stopPreview = useCallback(() => {
        setPreviewStream(p => { p?.getTracks().forEach(t => t.stop()); return null; });
        setPreviewVideoOn(false);
    }, []);

    /* room cam */
    const startVideo = useCallback(async () => {
        try {
            if (previewStream) {
                const s = previewStream;
                s.getAudioTracks().forEach(t => { t.enabled = isMicOn; });
                s.getVideoTracks().forEach(t => { t.contentHint = 'motion'; });
                setVideoStream(s); setPreviewStream(null); setIsVideoOn(true); return;
            }
            const s = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
            });
            s.getAudioTracks().forEach(t => { t.enabled = isMicOn; });
            s.getVideoTracks().forEach(t => { t.contentHint = 'motion'; });
            setVideoStream(s); setIsVideoOn(true);
        } catch (err) {
            console.error('Camera access error:', err);
        }
    }, [isMicOn, previewStream]);

    const stopVideo = useCallback(() => {
        setVideoStream(p => { p?.getTracks().forEach(t => t.stop()); return null; });
        setIsVideoOn(false);
    }, []);
    const toggleVideo = () => isVideoOn ? stopVideo() : startVideo();

    /* mic */
    const toggleMic = () => {
        if (videoStream) {
            videoStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        }
        setIsMicOn(p => !p);
    };

    const startScreen = async () => {
        try {
            const s = await navigator.mediaDevices.getDisplayMedia({ 
                video: { 
                    width: { ideal: 1920 }, 
                    height: { ideal: 1080 }, 
                    frameRate: { ideal: 30 }
                } as any,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            s.getVideoTracks().forEach(t => { 
                t.contentHint = 'detail';
                // Local hint for optimization
                if ((t as any).applyConstraints) {
                    (t as any).applyConstraints({ frameRate: 30 });
                }
            });
            s.getVideoTracks()[0].onended = () => { setScreenStream(null); setIsScreenSharing(false); };
            
            setScreenStream(s); 
            setIsScreenSharing(true);

            // Force immediate re-negotiation for all peers to send the new track
            Object.values(peers.current).forEach(pc => {
                s.getTracks().forEach(track => {
                    try { pc.addTrack(track, s); } catch(e) { console.warn(e); }
                });
            });

            // Update presence immediately
            presenceChannel.current?.track({
                user_id: user?.id,
                username: user?.username || user?.firstName || 'User',
                avatar_url: user?.imageUrl,
                is_mic_on: isMicOn,
                is_video_on: isVideoOn,
                is_speaking: isLocalSpeaking,
                is_screen_sharing: true, // Force true now
                is_hand_raised: isHandRaised,
                cam_stream_id: videoStreamRef.current?.id,
                screen_stream_id: s.id, // Use s.id directly
                joined_at: new Date().toISOString()
            });
        } catch (err) {
            console.error('Screen share error:', err);
        }
    };
    const stopScreen = useCallback(() => {
        setScreenStream(p => { p?.getTracks().forEach(t => t.stop()); return null; });
        setIsScreenSharing(false);
    }, []);
    const toggleScreen = () => isScreenSharing ? stopScreen() : startScreen();

    /* join */
    const handleJoin = () => {
        if (previewVideoOn && previewStream) {
            previewStream.getAudioTracks().forEach(t => { t.enabled = previewMicOn; });
            setVideoStream(previewStream); setPreviewStream(null);
            setIsVideoOn(true); setIsMicOn(previewMicOn);
        }
        setHasJoined(true);
        addActivity('app_used' as any, 'Joined Study Session');
    };

    const handleHangUp = () => { 
        stopVideo(); 
        stopScreen(); 
        setHasJoined(false); 
        setSessionSecs(0); 
        Object.values(peers.current).forEach(pc => pc.close());
        peers.current = {};
        setRemoteStreams({});
        setRemoteScreenStreams({});
    };

    useEffect(() => () => {
        videoStream?.getTracks().forEach(t => t.stop());
        screenStream?.getTracks().forEach(t => t.stop());
        previewStream?.getTracks().forEach(t => t.stop());
        Object.values(peers.current).forEach(pc => pc.close());
        peers.current = {};
        if (presenceChannel.current) presenceChannel.current.unsubscribe();
    }, []);

    const name   = user?.username || user?.firstName || 'You';
    const avatar = user?.imageUrl;

    return (
        <div className={clsx(styles.container, isFocusMode && styles.focusModeContainer)}>
            <AnimatePresence mode="wait">

                {/* ════════════ LOBBY ════════════ */}
                {!hasJoined && (
                    <motion.div key="lobby" className={styles.lobby}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>

                        <div className={styles.orb1} />
                        <div className={styles.orb2} />

                        <div className={styles.lobbyWrap}>
                            <div className={styles.lobbyLeft}>
                                <div className={styles.previewViewport}>
                                    {previewVideoOn && previewStream
                                        ? <VideoTile stream={previewStream} className={styles.previewVideo} mirror />
                                        : <div className={styles.previewAvatar}>
                                            {avatar
                                                ? <img src={avatar} alt="" className={styles.previewAvatarImg} />
                                                : <div className={styles.previewAvatarInitial}>{name[0]?.toUpperCase()}</div>
                                            }
                                            <span className={styles.previewAvatarName}>{name}</span>
                                          </div>
                                    }
                                    <div className={styles.previewScanline} />
                                    <div className={styles.previewBarOverlay}>
                                        <button
                                            className={clsx(styles.previewCtrl, !previewMicOn && styles.previewCtrlOff)}
                                            onClick={() => setPreviewMicOn(p => !p)}
                                        >
                                            {previewMicOn ? <Mic size={15} /> : <MicOff size={15} />}
                                        </button>
                                        <button
                                            className={clsx(styles.previewCtrl, !previewVideoOn && styles.previewCtrlOff)}
                                            onClick={previewVideoOn ? stopPreview : startPreview}
                                        >
                                            {previewVideoOn ? <Video size={15} /> : <VideoOff size={15} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.lobbyRight}>
                                <div className={styles.roomTag}>
                                    <Volume2 size={13} /> Voice Channel
                                </div>
                                <h1 className={styles.lobbyTitle}>Study Room</h1>
                                <p className={styles.lobbyDesc}>
                                    A focused space to study, share your screen, and stay in flow. Your settings carry in automatically.
                                </p>
                                <div className={styles.featureGrid}>
                                    {[
                                        { icon: <Video size={16} />, label: 'HD Video' },
                                        { icon: <MonitorUp size={16} />, label: 'Screen Share' },
                                        { icon: <Clock size={16} />, label: 'Session Timer' },
                                        { icon: <Zap size={16} />, label: 'Focus Mode' },
                                    ].map(f => (
                                        <div key={f.label} className={styles.featureChip}>
                                            {f.icon}
                                            <span>{f.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.lobbyBtns}>
                                    <motion.button
                                        className={styles.joinBtn}
                                        onClick={handleJoin}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Headphones size={18} /> Join Voice Channel
                                        <ChevronDown size={15} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                                    </motion.button>
                                    <button className={styles.inviteBtn} onClick={() => setShowInviteModal(true)}>
                                        <UserPlus size={15} /> Invite
                                    </button>
                                </div>
                                <p className={styles.lobbyFootnote}>By joining you agree to keep it focused 🎯</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ════════════ ROOM ════════════ */}
                {hasJoined && (
                    <motion.div key="room" className={styles.room}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

                        <div className={styles.header}>
                            <div className={styles.headerLeft}>
                                <div className={styles.headerChannelIcon}><Volume2 size={15} /></div>
                                <span className={styles.headerChannelName}>Study Room</span>
                                <span className={styles.headerSep}>·</span>
                                <span className={styles.headerSub}>General</span>
                            </div>
                            <div className={styles.headerCenter}>
                                {isScreenSharing && (
                                    <motion.div className={styles.headerBadge} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                                        <MonitorUp size={12} /> You are sharing
                                    </motion.div>
                                )}
                            </div>
                            <div className={styles.headerRight}>
                                <button className={clsx(styles.headerIconBtn, isFocusMode && styles.headerIconBtnActive)} onClick={() => setIsFocusMode(!isFocusMode)} title="Focus Mode">
                                    <Zap size={14} /> <span>Focus</span>
                                </button>
                                <div className={styles.headerSep}>·</div>
                                <div className={styles.headerTimer}><Activity size={11} /> {fmt(sessionSecs)}</div>
                            </div>
                        </div>

                        {ambientSound && (
                            <audio src={ambientSound} autoPlay loop ref={(el) => { if (el) el.volume = 0.4; }} />
                        )}

                        <div className={styles.stage}>
                            <div className={styles.stageNoise} />
                            <div className={styles.reactionOverlay}>
                                <AnimatePresence>
                                    {activeReactions.map(r => (
                                        <motion.div key={r.id} className={styles.floatingEmoji} initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1.2, y: -100 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 2.5, ease: "easeOut" }}>
                                            {r.emoji}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className={styles.stageContent} style={{ width: '100%', height: '100%' }}>
                                {participants.some(p => p.is_screen_sharing) ? (
                                    <motion.div key="screen" className={styles.screenLayout} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', height: '100%', display: 'flex' }}>
                                        <div className={styles.screenMain} ref={stageRef}>
                                            {(() => {
                                                const presenter = participants.find(p => p.is_screen_sharing);
                                                if (!presenter) return null;

                                                const isLocal = presenter.user_id === user?.id;
                                                const stream = isLocal ? screenStream : remoteScreenStreams[presenter.user_id];
                                                
                                                console.log('UI Render ScreenShare:', { 
                                                    presenter: presenter.username, 
                                                    isLocal, 
                                                    hasStream: !!stream, 
                                                    streamId: stream?.id,
                                                    allRemoteScreenStreams: Object.keys(remoteScreenStreams)
                                                });

                                                if (stream && stream.active) {
                                                    return <VideoTile key={`screen-${presenter.user_id}-${stream.id}`} stream={stream} className={styles.screenVideo} />;
                                                }

                                                return (
                                                    <div className={styles.remoteScreenPlaceholder}>
                                                        <div className={styles.screenGlow} />
                                                        <MonitorUp size={48} className={styles.screenIcon} />
                                                        <p>{presenter.username} is presenting</p>
                                                        <span className={styles.screenLoadingSub}>Connecting to stream...</span>
                                                    </div>
                                                );
                                            })()}
                                            <div className={styles.screenTopBar}>
                                                <div className={styles.screenBadge}>
                                                    <MonitorUp size={11} /> 
                                                    {participants.find(p => p.is_screen_sharing)?.username}&apos;s Screen
                                                </div>
                                                <button className={styles.expandBtn} onClick={() => toggleFullscreen()}>
                                                    {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                                                </button>
                                            </div>
                                            {isVideoOn && videoStream && (
                                                <motion.div className={styles.pip} drag dragMomentum={false}>
                                                    <VideoTile stream={videoStream} className={styles.pipVideo} mirror style={{ objectFit: 'cover' }} />
                                                    <div className={styles.pipOverlay}>{isMicOn ? <Mic size={9} /> : <MicOff size={9} className={styles.red} />} <span>{name}</span></div>
                                                </motion.div>
                                            )}
                                        </div>
                                        <div className={styles.screenSidebar}>
                                            <div className={styles.sidebarSection}>
                                                <p className={styles.sidebarHeading}>VIDEO — {participants.length}</p>
                                                <div className={styles.sidebarVideoList}>
                                                    {participants.map(p => {
                                                        const isLocal = p.user_id === user?.id;
                                                        const isVideoOnNow = isLocal ? isVideoOn : p.is_video_on;
                                                        
                                                        // Hide tab if user is sharing screen without camera
                                                        if (p.is_screen_sharing && !isVideoOnNow) return null;
                                                        
                                                        const stream = isLocal ? videoStream : remoteStreams[p.user_id];
                                                        
                                                        return (
                                                            <div key={p.id} className={styles.sidebarTile}>
                                                                {isVideoOnNow && stream ? (
                                                                    <>
                                                                        <VideoTile stream={stream} className={styles.sidebarVideo} mirror={isLocal} />
                                                                        <div className={styles.sidebarTileName}>{p.username}</div>
                                                                    </>
                                                                ) : (
                                                                    <div className={styles.sidebarAvatar}>
                                                                        <AvatarDisplay name={p.username} avatarUrl={p.avatar_url} size={32} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (participants.length > 1 || isVideoOn) ? (
                                    <div className={styles.cameraStage} style={{ width: '100%', height: '100%' }}>
                                        <div className={styles.participantsGrid}>
                                            <div className={styles.roomTimerOverlay}>
                                                <div className={styles.roomTimerChip}>
                                                    <Clock size={14} /> <span className={styles.roomTimerValue}>{fmt(roomTimer.timeLeft)}</span> <span className={styles.roomTimerType}>{roomTimer.type === 'focus' ? 'FOCUS' : 'BREAK'}</span>
                                                </div>
                                            </div>
                                            {participants.map(p => {
                                                const isLocal = p.user_id === user?.id;
                                                const isVideoOnNow = isLocal ? isVideoOn : p.is_video_on;
                                                const stream = isLocal ? videoStream : remoteStreams[p.user_id];
                                                const displayName = isLocal ? name : p.username;
                                                const tileColor = dominantColors[p.user_id]?.color || '#0b0c0e';

                                                return (
                                                    <motion.div 
                                                        key={p.id} 
                                                        className={clsx(styles.cameraTile, p.is_speaking && styles.cameraTileSpeaking)} 
                                                        layout 
                                                        initial={{ opacity: 0, scale: 0.9 }} 
                                                        animate={{ 
                                                            opacity: 1, 
                                                            scale: 1,
                                                            backgroundColor: isVideoOnNow ? '#000' : tileColor
                                                        }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {isVideoOnNow && stream ? (
                                                            <VideoTile stream={stream} className={styles.cameraVideo} mirror={isLocal} style={{ objectFit: 'cover' }} />
                                                        ) : (
                                                            <div className={styles.remoteAvatarTile}>
                                                                <div className={styles.avatarWrap}>
                                                                    <div className={styles.avatarGlow} style={{ backgroundColor: dominantColors[p.user_id]?.color || '#5865f2' }} />
                                                                    <div className={clsx(styles.speakingRing, (isLocal ? isLocalSpeaking : p.is_speaking) && styles.speaking)} style={isLocal ? { scale: 1 + (localVolume / 200) } : {}} />
                                                                    <AvatarDisplay name={displayName} avatarUrl={isLocal ? avatar : p.avatar_url} size={140} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className={styles.tileOverlay} style={{ background: 'transparent', boxShadow: 'none' }}>
                                                            {isVideoOnNow && (
                                                                <div className={styles.tileName}>
                                                                    {!(isLocal ? isMicOn : p.is_mic_on) && <MicOff size={12} className={styles.red} />}
                                                                    {displayName}
                                                                </div>
                                                            )}
                                                            <div className={styles.tileActions}>
                                                                {p.is_hand_raised && <div className={styles.handBadge}><Hand size={12} /></div>}
                                                                {isVideoOnNow && (
                                                                    <button className={styles.expandBtn} onClick={(e) => toggleFullscreen(e.currentTarget.closest('div[class*="cameraTile"]') as HTMLElement)}>
                                                                        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <motion.div key="empty" className={styles.emptyStage} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <div className={styles.emptyAvatarWrap}>
                                            <div className={styles.emptyGlow} /><div className={styles.emptyRipple1} /><div className={styles.emptyRipple2} />
                                            <div className={styles.emptyAvatarCircle}><AvatarDisplay name={name} avatarUrl={avatar} size={92} /></div>
                                            {isMicOn && <div className={styles.emptyMicRing} />}
                                        </div>
                                        <div className={styles.emptyMeta}>
                                            <span className={styles.emptyName}>{name}</span>
                                            <div className={styles.emptyStatus}>
                                                {isMicOn ? <><Mic size={11} /><span>Mic on</span></> : <><MicOff size={11} className={styles.red} /><span className={styles.red}>Muted</span></>}
                                                <span className={styles.emptyStatusSep}>·</span><span>Camera off</span>
                                            </div>
                                        </div>
                                        <div className={styles.actionRow}>
                                            <ActionCard icon={<Video size={20} />} title="Turn On Camera" sub="Share your face" color="#5865f2" bg="rgba(88,101,242,0.12)" onClick={toggleVideo} />
                                            <ActionCard icon={<MonitorUp size={20} />} title="Share Screen" sub="Present your work" color="#23a55a" bg="rgba(35,165,90,0.12)" onClick={toggleScreen} />
                                            <ActionCard icon={<Hand size={20} />} title="Raise Hand" sub="Let others know" color="#faa61a" bg="rgba(250,166,26,0.1)" onClick={() => setIsHandRaised(h => !h)} active={isHandRaised} />
                                        </div>
                                        <p className={styles.emptyTip}>💡 Room is private to your friend circle</p>
                                    </motion.div>
                                )}
                            </div>

                            <AnimatePresence>
                                {activePanel && (
                                    <motion.div className={styles.sidePanel} initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}>
                                        <div className={styles.sidePanelContent}>
                                            <div className={styles.sidePanelHeader}><h3>{activePanel === 'participants' ? 'Participants' : activePanel === 'chat' ? 'Room Chat' : 'Settings'}</h3></div>
                                            <div className={styles.sidePanelBody}>
                                                {activePanel === 'participants' && (
                                                    <div className={styles.participantList}>
                                                        {participants.filter(p => p.user_id !== user?.id).map(p => (
                                                            <div key={p.id} className={styles.participantItem}>
                                                                <div className={styles.participantAvatar}><AvatarDisplay name={p.username} avatarUrl={p.avatar_url} size={32} /><div className={styles.onlineStatus} /></div>
                                                                <span className={styles.participantName}>{p.username}</span>
                                                                <div className={styles.participantBadges}>{p.is_mic_on ? <Mic size={12} className={styles.mutedIcon} /> : <MicOff size={12} className={styles.mutedIconRed} />}</div>
                                                            </div>
                                                        ))}
                                                        {participants.length <= 1 && <p className={styles.soloHint}>You are currently the only one here.</p>}
                                                    </div>
                                                )}
                                                {activePanel === 'chat' && (
                                                    <div className={styles.chatContainer}>
                                                        <div className={styles.chatMessages}>{messages.length === 0 ? <p className={styles.chatWelcome}>Welcome to the room chat!</p> : messages.map((msg) => (
                                                            <div key={msg.id} className={styles.chatMessage}><div className={styles.chatMsgHeader}><span className={styles.chatMsgName}>{msg.name}</span><span className={styles.chatMsgTime}>{msg.time}</span></div><p className={styles.chatMsgContent}>{msg.content}</p></div>
                                                        ))}</div>
                                                        <div className={styles.chatInputWrapper}><div className={styles.chatInputInner}><input type="text" placeholder="Message room..." className={styles.chatInput} value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} /><button className={styles.chatSendBtn} onClick={handleSendMessage}><Send size={16} /></button></div></div>
                                                    </div>
                                                )}
                                                {activePanel === 'settings' && (
                                                    <div className={styles.settingsPanel}>
                                                        <div className={styles.settingsSection}>
                                                            <h4>Room Timer</h4>
                                                            <div className={styles.timerControls}>
                                                                <button className={styles.settingsBtn} onClick={() => resetRoomTimer('focus')}><Clock size={14} /> 25m Focus</button>
                                                                <button className={styles.settingsBtn} onClick={() => resetRoomTimer('break')}><Zap size={14} /> 5m Break</button>
                                                                <button className={clsx(styles.settingsBtn, roomTimer.isActive && styles.active)} onClick={toggleRoomTimer}>{roomTimer.isActive ? 'Pause Timer' : 'Start Timer'}</button>
                                                            </div>
                                                        </div>
                                                        <div className={styles.settingsSection}>
                                                            <h4>Ambient Soundscape</h4>
                                                            <div className={styles.soundGrid}>
                                                                {[
                                                                    { name: 'None', url: null },
                                                                    { name: 'Lo-Fi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
                                                                    { name: 'Rain', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
                                                                    { name: 'Forest', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
                                                                ].map(s => (
                                                                    <button key={s.name} className={clsx(styles.soundBtn, ambientSound === s.url && styles.active)} onClick={() => setAmbientSound(s.url)}>{s.name}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className={styles.controls}>
                            <div className={styles.ctrlLeft}>
                                <div className={styles.ctrlUserAvatar}><AvatarDisplay name={name} avatarUrl={avatar} size={32} /><div className={styles.ctrlUserOnline} /></div>
                                <div className={styles.ctrlUserInfo}><span className={styles.ctrlUserName}>{name}</span><span className={styles.ctrlUserStatus}><span className={styles.ctrlVoiceDot} />Voice Connected</span></div>
                            </div>
                            <div className={styles.ctrlCenter}>
                                <CtrlBtn danger={!isMicOn} onClick={toggleMic} label={isMicOn ? 'Mute' : 'Unmute'}>{isMicOn ? <Mic size={18} /> : <MicOff size={18} />}</CtrlBtn>
                                <CtrlBtn danger={isDeafened} onClick={() => setIsDeafened(d => !d)} label={isDeafened ? 'Undeafen' : 'Deafen'}>{isDeafened ? <VolumeX size={18} /> : <Volume2 size={18} />}</CtrlBtn>
                                <div className={styles.ctrlDivider} />
                                <CtrlBtn active={isVideoOn} onClick={toggleVideo} label={isVideoOn ? 'Stop Camera' : 'Start Camera'}>{isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}</CtrlBtn>
                                <CtrlBtn active={isScreenSharing} onClick={toggleScreen} label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}>{isScreenSharing ? <MonitorOff size={18} /> : <MonitorUp size={18} />}</CtrlBtn>
                                <CtrlBtn active={isHandRaised} onClick={() => setIsHandRaised(h => !h)} label={isHandRaised ? 'Lower Hand' : 'Raise Hand'}><Hand size={18} /></CtrlBtn>
                                <div style={{ position: 'relative' }}>
                                    <CtrlBtn active={showReactionPicker} onClick={() => setShowReactionPicker(!showReactionPicker)} label="Reactions"><Smile size={18} /></CtrlBtn>
                                    <AnimatePresence>{showReactionPicker && (
                                        <motion.div className={styles.reactionPicker} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: -5, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}>
                                            {['🔥', '👏', '💖', '😂', '💯', '✨', '🚀', '😮'].map(emoji => (
                                                <button key={emoji} className={styles.pickerEmoji} onClick={() => triggerReaction(emoji)}>{emoji}</button>
                                            ))}
                                        </motion.div>
                                    )}</AnimatePresence>
                                </div>
                                <div className={styles.ctrlDivider} />
                                <motion.button className={styles.disconnectBtn} onClick={handleHangUp} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}><PhoneOff size={15} /><span>Leave</span></motion.button>
                            </div>
                            <div className={styles.ctrlRight}>
                                <CtrlBtn label="Participants" active={activePanel === 'participants'} onClick={() => setActivePanel(p => p === 'participants' ? null : 'participants')}><Users size={18} /></CtrlBtn>
                                <CtrlBtn label="Chat" active={activePanel === 'chat'} onClick={() => setActivePanel(p => p === 'chat' ? null : 'chat')}><MessageSquare size={18} /></CtrlBtn>
                                <CtrlBtn label="Settings" active={activePanel === 'settings'} onClick={() => setActivePanel(p => p === 'settings' ? null : 'settings')}><Settings size={18} /></CtrlBtn>
                            </div>
                        </div>
                    </motion.div>
                )}

                <AnimatePresence>
                    {showInviteModal && (
                        <div className={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
                            <motion.div className={styles.inviteModal} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}>
                                <div className={styles.modalHeader}><div><h2>Invite Friends</h2><p>Select friends to join this room</p></div><button className={styles.modalClose} onClick={() => setShowInviteModal(false)}><X size={20} /></button></div>
                                <div className={styles.modalSearch}><Search size={16} className={styles.searchIcon} /><input type="text" placeholder="Search friends..." value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} /></div>
                                <div className={styles.modalList}>
                                    {friends.length === 0 ? <div className={styles.modalEmpty}><Users size={32} /><p>No friends found</p></div> : friends.filter(f => f.username?.toLowerCase().includes(inviteSearch.toLowerCase())).map(f => (
                                        <div key={f.id} className={styles.modalItem}>
                                            <div className={styles.modalMemberInfo}><AvatarDisplay name={f.username || 'User'} avatarUrl={f.avatar_url} size={40} /><div className={styles.modalMemberMeta}><span className={styles.modalMemberName}>{f.username}</span><span className={styles.modalMemberStatus}>{f.is_online ? <span className={styles.onlineText}>Online</span> : 'Offline'}</span></div></div>
                                            <button className={clsx(styles.modalInviteBtn, invitingIds.includes(f.id) && styles.sent)} onClick={() => handleSendInvite(f.id)} disabled={invitingIds.includes(f.id)}>{invitingIds.includes(f.id) ? <><Check size={14} /> Sent</> : 'Invite'}</button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </AnimatePresence>
        </div>
    );
}
