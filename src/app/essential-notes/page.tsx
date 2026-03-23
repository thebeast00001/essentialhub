"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { BookOpen, Sparkles, Youtube, Palette, Loader2 } from 'lucide-react';
import styles from './EssentialNotes.module.css';
import clsx from 'clsx';

export default function EssentialNotesPage() {
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!url) return;
        
        setIsLoading(true);
        setError('');
        setNotes('');

        try {
            const response = await fetch('/api/essential-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate essential notes');
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    setNotes((prev) => prev + chunk);
                }
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <BookOpen size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
                <h1 className={styles.title}>ESSENTIAL NOTES</h1>
                <p className={styles.subtitle}>
                    Paste any YouTube educational video to generate the perfect handwritten-style textbook summary.
                </p>
            </div>

            <div className={styles.inputGroup}>
                <Youtube color="var(--text-muted)" style={{ marginTop: '14px', alignSelf: 'flex-start' }} />
                <input
                    type="text"
                    placeholder="https://youtube.com/watch?v=..."
                    className={styles.input}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button 
                    className={styles.btn} 
                    onClick={handleGenerate} 
                    disabled={isLoading || !url}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    {isLoading ? "Writing Notes..." : "Generate"}
                </button>
            </div>

            {error && (
                <div className={styles.errorText}>
                    {error}
                </div>
            )}

            {(notes || isLoading) && (
                <div className={styles.notebookContainer}>
                    <div className={styles.notebookContent}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                p: ({ node, children, ...props }: any) => {
                                    // Handle [ILLUSTRATION: ...] blocks beautifully
                                    const textContent = String(children);
                                    if (textContent.includes('[ILLUSTRATION:') && textContent.includes(']')) {
                                        const cleanText = textContent.replace('[ILLUSTRATION:', '').replace(']', '').trim();
                                        return (
                                            <div className={styles.illustrationBlock}>
                                                <Palette className={styles.illustrationIcon} size={28} />
                                                <span><strong>Visual Note Placeholder:</strong> {cleanText}</span>
                                            </div>
                                        );
                                    }
                                    return <p {...props}>{children}</p>;
                                }
                            }}
                        >
                            {notes}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
}
