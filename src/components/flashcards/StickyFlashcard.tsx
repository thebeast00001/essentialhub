'use client';

import React, { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StickyFlashcard({ content }: { content: string }) {
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        // Simulated DB save for Phase 2
        try {
            const deck = JSON.parse(localStorage.getItem('zenith_flashcards') || '[]');
            deck.push({ content, date: new Date().toISOString() });
            localStorage.setItem('zenith_flashcards', JSON.stringify(deck));
        } catch (e) {
            console.error('Failed to save to local storage', e);
        }
    };

    return (
        <motion.div 
            initial={{ rotate: Math.random() * 4 - 2, scale: 0.95 }}
            animate={{ rotate: Math.random() * 2 - 1, scale: 1 }}
            whileHover={{ scale: 1.02, rotate: 0, zIndex: 10 }}
            style={{
                background: '#fef08a', 
                padding: '24px 24px 36px',
                borderRadius: '2px 12px 2px 12px',
                boxShadow: '4px 8px 15px rgba(0,0,0,0.1), inset 0 0 40px rgba(0,0,0,0.02)',
                width: 'fit-content',
                minWidth: '280px',
                maxWidth: '450px',
                margin: '40px auto',
                fontFamily: "'Caveat', cursive",
                fontSize: '24px',
                color: '#1e3a8a',
                position: 'relative',
                borderTop: '25px solid #fde047'
            }}
        >
            {/* The Semi-transparent Tape */}
            <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%) rotate(-2deg)',
                width: '80px',
                height: '25px',
                background: 'rgba(255,255,255,0.5)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid rgba(0,0,0,0.05)'
            }} />

            {/* Content */}
            <div style={{ lineHeight: '1.3' }}>
                {content.trim().split('\n').map((line, i) => {
                    const isTerm = line.includes(':');
                    if (isTerm && i === 0) { // Highlight the first term
                        return (
                            <div key={i} style={{ marginBottom: '12px', borderBottom: '2px dashed rgba(30, 58, 138, 0.2)', paddingBottom: '8px' }}>
                                <strong style={{ color: '#dc2626', fontSize: '28px' }}>{line.split(':')[0]}:</strong>
                                <br />
                                <span>{line.split(':').slice(1).join(':')}</span>
                            </div>
                        );
                    }
                    return (
                        <div key={i} style={{ marginBottom: '8px' }}>
                            {line}
                        </div>
                    );
                })}
            </div>

            {/* Save Button */}
            <button 
                onClick={handleSave}
                disabled={saved}
                style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: saved ? 'default' : 'pointer',
                    color: saved ? '#16a34a' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 0.2s ease'
                }}
            >
                {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {saved ? 'Saved to DB' : 'Save Note'}
            </button>
        </motion.div>
    );
}
