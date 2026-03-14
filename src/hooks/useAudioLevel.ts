import { useState, useEffect, useRef } from 'react';

export function useAudioLevel(stream: MediaStream | null) {
    const [level, setLevel] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const ctxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!stream || stream.getAudioTracks().length === 0) {
            setLevel(0);
            setIsSpeaking(false);
            return;
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyzer = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyzer.fftSize = 256;
        source.connect(analyzer);

        ctxRef.current = audioContext;
        analyzerRef.current = analyzer;
        sourceRef.current = source;

        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        
        const update = () => {
            if (!analyzerRef.current) return;
            analyzerRef.current.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            
            const average = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((average / 128) * 100));
            
            setLevel(normalized);
            setIsSpeaking(normalized > 5); // Threshold for speaking
            
            rafRef.current = requestAnimationFrame(update);
        };

        update();

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            if (ctxRef.current) ctxRef.current.close().catch(() => {});
            analyzerRef.current = null;
            sourceRef.current = null;
            ctxRef.current = null;
        };
    }, [stream]);

    return { level, isSpeaking };
}
