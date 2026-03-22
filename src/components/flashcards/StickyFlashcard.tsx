'use client';

import React, { useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';

export default function StickyFlashcard({ content }: { content: string }) {
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const { user } = useUser();

    const handleSave = async () => {
        if (!user || saving || saved) return;
        setSaving(true);
        
        try {
            const { error } = await supabase.from('flashcards').insert({
                user_id: user.id,
                content: content.trim(),
            });

            if (error) throw error;
            setSaved(true);
        } catch (e: any) {
            console.error('Supabase Save Error:', e);
            alert(`Failed to save: ${e.message || 'Check your Supabase configuration'}`);
            setSaved(false); 
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ rotate: Math.random() * 4 - 2, y: 20, opacity: 0 }}
                animate={{ rotate: Math.random() * 2 - 1, y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0, rotate: 15, transition: { duration: 0.5, ease: "backIn" } }}
                whileHover={{ scale: 1.02, rotate: 0, zIndex: 10 }}
                style={{
                    background: '#fef3c7', 
                    padding: '24px 24px 45px',
                    borderRadius: '2px 2px 2px 2px',
                    boxShadow: '2px 5px 15px rgba(0,0,0,0.08), inset 0 0 60px rgba(0,0,0,0.03)',
                    width: '100%',
                    maxWidth: '500px',
                    margin: '32px auto',
                    fontFamily: "'Caveat', cursive",
                    fontSize: '22px',
                    color: '#1e3a8a',
                    position: 'relative',
                    borderTop: '20px solid #fcd34d',
                    overflow: 'hidden'
                }}
            >
                {/* The Tape Effect */}
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-1deg)',
                    width: '90px',
                    height: '25px',
                    background: 'rgba(255,255,255,0.4)',
                    backdropFilter: 'blur(2px)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    zIndex: 5
                }} />

                {/* Content with Markdown & Math support */}
                <div style={{ lineHeight: '1.4' }} className="sticky-markdown">
                    <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                    >
                        {content.trim()}
                    </ReactMarkdown>
                </div>

                {/* Save Button */}
                <button 
                    onClick={handleSave}
                    disabled={saved || saving}
                    style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '16px',
                        background: saved ? '#16a34a' : 'rgba(30, 58, 138, 0.05)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        cursor: (saved || saving) ? 'default' : 'pointer',
                        color: saved ? '#fff' : '#1e3a8a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : (saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />)}
                    {saved ? 'Saved to Library' : 'Add to Deck'}
                </button>

                <style jsx global>{`
                    .sticky-markdown p { margin: 0 0 10px 0; }
                    .sticky-markdown strong { color: #dc2626; font-size: 1.2em; border-bottom: 1px dashed rgba(220, 38, 38, 0.3); }
                    .sticky-markdown .katex-display { margin: 10px 0; font-size: 0.9em; overflow-x: auto; padding-bottom: 5px; }
                    .sticky-markdown .katex { color: #1e3a8a !important; }
                `}</style>
            </motion.div>
        </AnimatePresence>
    );
}

