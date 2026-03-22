'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Box, Ruler } from 'lucide-react';

export default function MomentOfInertiaSandbox() {
    const [mass, setMass] = useState(5); // kg
    const [radius, setRadius] = useState(2); // m
    
    // I = 1/2 m r^2 for a solid disk
    const inertia = (0.5 * mass * Math.pow(radius, 2)).toFixed(1);
    
    // Base simulation on constant energy/torque visual abstraction.
    // Higher inertia means it takes much longer to complete a spin.
    const spinDuration = Math.max(0.5, Number(inertia) / 4);

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
                <RotateCcw size={22} color="#3b82f6" />
                Interactive Sandbox: Solid Disk Rotation
            </h4>
            
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                {/* Visualizer */}
                <div style={{ 
                    flex: '1', minWidth: '220px', height: '240px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: spinDuration, ease: "linear" }}
                        style={{
                            width: `${Math.max(40, radius * 35)}px`,
                            height: `${Math.max(40, radius * 35)}px`,
                            borderRadius: '50%',
                            background: 'conic-gradient(from 0deg, #93c5fd, #3b82f6, #93c5fd)',
                            boxShadow: '0 8px 30px rgba(59, 130, 246, 0.4)',
                            border: '2px solid #2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {/* Center Axle */}
                        <div style={{ width: '12px', height: '12px', background: '#1e3a8a', borderRadius: '50%', border: '2px solid #fff' }} />
                        {/* Visual marker line to see rotation easily */}
                        <div style={{ position: 'absolute', top: 0, left: '50%', width: '2px', height: '50%', background: '#1e3a8a', transform: 'translateX(-50%)' }} />
                    </motion.div>
                </div>

                {/* Controls */}
                <div style={{ flex: '1.2', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#334155', fontSize: '15px', fontWeight: 'bold' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Box size={18} color="#64748b"/> Mass (m)</span>
                            <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>{mass} kg</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" max="20" step="1" 
                            value={mass} 
                            onChange={(e) => setMass(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#3b82f6', height: '6px' }}
                        />
                    </div>
                    
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#334155', fontSize: '15px', fontWeight: 'bold' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Ruler size={18} color="#64748b"/> Radius (r)</span>
                            <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>{radius} m</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" max="5" step="0.5" 
                            value={radius} 
                            onChange={(e) => setRadius(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#3b82f6', height: '6px' }}
                        />
                    </div>

                    <div style={{ 
                        background: 'linear-gradient(to right, #eff6ff, #dbeafe)', 
                        padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe',
                        fontFamily: "'Caveat', cursive", fontSize: '28px', color: '#1e40af',
                        marginTop: 'auto',
                        lineHeight: '1.2'
                    }}>
                        <div style={{ fontSize: '22px', opacity: 0.8 }}>Disk: <span style={{ fontFamily: 'Times New Roman, serif' }}>I = &frac12; m r&sup2;</span></div>
                        <div style={{ marginTop: '8px' }}>
                            I = &frac12; ({mass})({radius})&sup2; = <b style={{ color: '#dc2626' }}>{inertia}</b> <span style={{ fontSize: '20px' }}>kg&middot;m&sup2;</span>
                        </div>
                    </div>
                </div>
            </div>
            <p style={{ margin: '16px 0 0', fontSize: '14px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                *Watch the disc spin. Higher Moment of Inertia ({inertia}) means it resists rotation, spinning slower!
            </p>
        </div>
    );
}
