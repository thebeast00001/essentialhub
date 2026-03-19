"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const AuthLogo = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const gridSize = 8;
        const pixelSize = width / gridSize;
        const chars = ['0', '1'];

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            
            ctx.font = `${pixelSize * 0.8}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 8-pointed star shape mask (approximate grid-based)
            const mask = [
                [0,0,0,1,1,0,0,0],
                [0,0,1,1,1,1,0,0],
                [0,1,1,1,1,1,1,0],
                [1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1],
                [0,1,1,1,1,1,1,0],
                [0,0,1,1,1,1,0,0],
                [0,0,0,1,1,0,0,0],
            ];

            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    if (mask[y][x]) {
                        const char = chars[Math.floor(Math.random() * chars.length)];
                        ctx.fillStyle = Math.random() > 0.3 ? '#ffffff' : '#333333';
                        ctx.fillText(
                            char, 
                            x * pixelSize + pixelSize / 2, 
                            y * pixelSize + pixelSize / 2
                        );
                    }
                }
            }

            // Lower FPS to match the flicker in the video
            animationFrameId = setTimeout(() => {
                requestAnimationFrame(render);
            }, 100) as unknown as number;
        };

        render();

        return () => {
            if (typeof animationFrameId === 'number') {
                clearTimeout(animationFrameId);
            }
        };
    }, []);

    return (
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ width: 120, height: 120, margin: '0 auto 40px' }}
        >
            <canvas ref={canvasRef} width={120} height={120} />
        </motion.div>
    );
};
