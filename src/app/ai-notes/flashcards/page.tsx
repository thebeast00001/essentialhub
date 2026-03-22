'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Library, Trash2, Brain, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import styles from './Flashcards.module.css';

interface Flashcard {
    id: string;
    content: string;
    created_at: string;
}

export default function FlashcardsPage() {
    const { user, isLoaded } = useUser();
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isLoaded && user) {
            fetchFlashcards();
        } else if (isLoaded && !user) {
            setLoading(false);
        }
    }, [user, isLoaded]);

    const fetchFlashcards = async () => {
        try {
            const { data, error } = await supabase
                .from('flashcards')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFlashcards(data || []);
        } catch (error) {
            console.error('Error fetching flashcards:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteFlashcard = async (id: string) => {
        try {
            const { error } = await supabase
                .from('flashcards')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setFlashcards(flashcards.filter(f => f.id !== id));
        } catch (error) {
            console.error('Error deleting flashcard:', error);
        }
    };

    if (!isLoaded || loading) {
        return (
            <div className={styles.loading}>
                <Loader2 className="animate-spin" size={48} color="#4f46e5" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <h2 className={styles.title}>Access Denied</h2>
                    <p className={styles.subtitle}>Please sign in to view your study deck.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Link href="/ai-notes" className={styles.backBtn}>
                <ArrowLeft size={18} />
                Back to Notes
            </Link>

            <header className={styles.header}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className={styles.title}>
                        <Library size={42} color="#fcd34d" />
                        Your Study Deck
                    </h1>
                    <p className={styles.subtitle}>
                        Review your saved concepts and formulas. Ready for the next exam?
                    </p>
                </motion.div>
            </header>

            {flashcards.length === 0 ? (
                <div className={styles.emptyState}>
                    <Brain size={64} className={styles.emptyIcon} />
                    <h3>Your library is empty.</h3>
                    <p>Go to your AI Notes and tap "Add to Deck" on any sticky note!</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    <AnimatePresence>
                        {flashcards.map((card) => (
                            <motion.div 
                                key={card.id}
                                className={styles.cardWrapper}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                layout
                            >
                                <button 
                                    className={styles.deleteBtn}
                                    onClick={() => deleteFlashcard(card.id)}
                                    title="Remove from library"
                                >
                                    <Trash2 size={14} />
                                </button>
                                
                                <div style={{
                                    background: '#fef3c7', 
                                    padding: '24px 24px 36px',
                                    borderRadius: '2px 2px 2px 2px',
                                    boxShadow: '2px 5px 15px rgba(0,0,0,0.06)',
                                    fontFamily: "'Caveat', cursive",
                                    fontSize: '20px',
                                    color: '#1e3a8a',
                                    position: 'relative',
                                    borderTop: '15px solid #fcd34d',
                                    minHeight: '200px'
                                }}>
                                    <div style={{ lineHeight: '1.4' }} className="sticky-markdown">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkMath]} 
                                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                                        >
                                            {card.content}
                                        </ReactMarkdown>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '10px', left: '20px', fontSize: '12px', color: '#94a3b8', fontFamily: 'Inter' }}>
                                        {new Date(card.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <style jsx global>{`
                .sticky-markdown p { margin: 0 0 10px 0; }
                .sticky-markdown strong { color: #dc2626; font-size: 1.2em; border-bottom: 1px dashed rgba(220, 38, 38, 0.3); }
                .sticky-markdown .katex-display { margin: 10px 0; font-size: 0.9em; overflow-x: auto; padding-bottom: 5px; }
                .sticky-markdown .katex { color: #1e3a8a !important; }
            `}</style>
        </div>
    );
}
