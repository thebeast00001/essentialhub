'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Play, RotateCcw } from 'lucide-react';

export default function ProjectileSandbox() {
    const [velocity, setVelocity] = useState(25); // m/s
    const [angle, setAngle] = useState(45); // degrees
    
    // Constant g = 9.8
    const g = 9.8;
    const angleRad = (angle * Math.PI) / 180;
    
    // Range = (v^2 * sin(2*theta)) / g
    const range = (Math.pow(velocity, 2) * Math.sin(2 * angleRad)) / g;
    // Max Height = (v^2 * sin^2(theta)) / (2*g)
    const maxHeight = (Math.pow(velocity, 2) * Math.pow(Math.sin(angleRad), 2)) / (2 * g);

    // Calculate path for the SVG line
    const pathData = useMemo(() => {
        let points = [];
        const tTotal = (2 * velocity * Math.sin(angleRad)) / g;
        for (let t = 0; t <= tTotal; t += tTotal / 50) {
            const x = velocity * Math.cos(angleRad) * t;
            const y = (velocity * Math.sin(angleRad) * t) - (0.5 * g * Math.pow(t, 2));
            points.push(`${x * 5},${180 - (y * 5)}`); // Scaling for SVG
        }
        return `M 0,180 Q ${range*2.5},${180 - (maxHeight*10)} ${range*5},180`;
    }, [velocity, angle, range, maxHeight]);

    return (
        <div style={{
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            margin: '40px 0',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
        }}>
            <h4 style={{ margin: '0 0 20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: 700 }}>
                <Target size={22} color="#f59e0b" />
                Interactive Sandbox: Projectile Motion
            </h4>
            
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                {/* Visualizer */}
                <div style={{ 
                    flex: '1.5', minWidth: '300px', height: '240px', 
                    background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9',
                    position: 'relative', overflow: 'hidden', padding: '20px'
                }}>
                    <svg width="100%" height="100%" viewBox="0 0 400 200" style={{ overflow: 'visible' }}>
                        {/* Ground */}
                        <line x1="0" y1="180" x2="400" y2="180" stroke="#cbd5e1" strokeWidth="2" />
                        
                        {/* Path */}
                        <motion.path
                            key={`${velocity}-${angle}`}
                            d={pathData}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeDasharray="400"
                            initial={{ strokeDashoffset: 400 }}
                            animate={{ strokeDashoffset: 0 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        />

                        {/* Cannon / Launcher */}
                        <g transform={`rotate(${-angle}, 0, 180)`}>
                            <rect x="-10" y="170" width="40" height="20" fill="#475569" rx="4" />
                        </g>

                        {/* Target Marker */}
                        <circle cx={Math.min(380, range * 5)} cy="180" r="5" fill="#f43f5e" />
                    </svg>

                    <div style={{ position: 'absolute', bottom: '10px', right: '15px', color: '#64748b', fontSize: '12px' }}>
                        Range: {range.toFixed(1)}m | Max Height: {maxHeight.toFixed(1)}m
                    </div>
                </div>

                {/* Controls */}
                <div style={{ flex: '1', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontSize: '14px', fontWeight: 600 }}>
                            Initial Velocity: {velocity} m/s
                        </label>
                        <input 
                            type="range" min="10" max="40" value={velocity}
                            onChange={(e) => setVelocity(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#3b82f6' }}
                        />
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontSize: '14px', fontWeight: 600 }}>
                            Launch Angle: {angle}°
                        </label>
                        <input 
                            type="range" min="0" max="90" value={angle}
                            onChange={(e) => setAngle(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#f59e0b' }}
                        />
                    </div>

                    <div style={{ 
                        marginTop: '10px', background: '#fef3c7', padding: '15px', borderRadius: '10px',
                        fontFamily: "'Caveat', cursive", fontSize: '20px', color: '#92400e', border: '1px dashed #f59e0b'
                    }}>
                        Physics Hint: Maximum range is always achieved at <b style={{ color: '#dc2626' }}>45°</b>!
                    </div>
                </div>
            </div>
        </div>
    );
}
