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
                                    const textContent = String(children);
                                    if (textContent.includes('[ILLUSTRATION:') && textContent.includes(']')) {
                                        const cleanText = textContent.replace('[ILLUSTRATION:', '').replace(']', '').trim();
                                        return <Illustration text={cleanText} />;
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

const Illustration = ({ text }: { text: string }) => {
    const [imageUrl, setImageUrl] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let isMounted = true;
        const fetchImage = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/essential-notes/illustrate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: text })
                });
                if (!res.ok) throw new Error('Generation failed');
                const blob = await res.blob();
                if (isMounted) setImageUrl(URL.createObjectURL(blob));
            } catch (err: any) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchImage();
        return () => { isMounted = false; };
    }, [text]);

    return (
        <div className={styles.illustrationBlock}>
            {loading && (
                <div className={styles.loadingPulse}>
                    <Loader2 className="animate-spin" size={24} style={{ marginBottom: '8px' }} />
                    <br />
                    Generating Illustration...
                </div>
            )}
            {error && <div className={styles.errorText}>Illustration could not be loaded ({error}).</div>}
            {imageUrl && <img src={imageUrl} alt={text} className={styles.generatedImage} style={{ maxWidth: '100%', borderRadius: '8px' }} />}
            <span className={styles.illustrationCaption}><strong>Visual:</strong> {text}</span>
        </div>
    );
};
