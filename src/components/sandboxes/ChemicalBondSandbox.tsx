"use client";

import React, { useState, useEffect } from 'react';
import styles from './Sandbox.module.css'; // Assuming this exists or I'll create it

export default function ChemicalBondSandbox() {
    const [atom1, setAtom1] = useState({ x: 100, y: 150 });
    const [atom2, setAtom2] = useState({ x: 300, y: 150 });
    const [bondType, setBondType] = useState('single');

    return (
        <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '20px',
            margin: '20px 0',
            textAlign: 'center',
            color: '#fff'
        }}>
            <h4 style={{ marginBottom: '15px', color: '#60a5fa' }}>🧪 Interactive Chemical Bonding</h4>
            <div style={{ position: 'relative', height: '300px', width: '100%', background: '#0a0a0c', borderRadius: '12px', overflow: 'hidden' }}>
                <svg width="100%" height="100%" viewBox="0 0 400 300">
                    {/* The Bond */}
                    {bondType === 'single' && (
                        <line x1={atom1.x} y1={atom1.y} x2={atom2.x} y2={atom2.y} stroke="#60a5fa" strokeWidth="4" />
                    )}
                    {bondType === 'double' && (
                        <>
                            <line x1={atom1.x} y1={atom1.y - 10} x2={atom2.x} y2={atom2.y - 10} stroke="#60a5fa" strokeWidth="4" />
                            <line x1={atom1.x} y1={atom1.y + 10} x2={atom2.x} y2={atom2.y + 10} stroke="#60a5fa" strokeWidth="4" />
                        </>
                    )}
                    {bondType === 'triple' && (
                        <>
                            <line x1={atom1.x} y1={atom1.y - 15} x2={atom2.x} y2={atom2.y - 15} stroke="#60a5fa" strokeWidth="4" />
                            <line x1={atom1.x} y1={atom1.y} x2={atom2.x} y2={atom2.y} stroke="#60a5fa" strokeWidth="4" />
                            <line x1={atom1.x} y1={atom1.y + 15} x2={atom2.x} y2={atom2.y + 15} stroke="#60a5fa" strokeWidth="4" />
                        </>
                    )}

                    {/* Atoms */}
                    <circle cx={atom1.x} cy={atom1.y} r="30" fill="#3b82f6" />
                    <text x={atom1.x} y={atom1.y + 7} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">C</text>
                    
                    <circle cx={atom2.x} cy={atom2.y} r="30" fill="#3b82f6" />
                    <text x={atom2.x} y={atom2.y + 7} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">C</text>

                    {/* Electrons decoration */}
                    <circle cx={atom1.x} cy={atom1.y} r="45" fill="none" stroke="rgba(96,165,250,0.2)" strokeDasharray="5,5">
                        <animateTransform attributeName="transform" type="rotate" from="0 100 150" to="360 100 150" dur="5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={atom2.x} cy={atom2.y} r="45" fill="none" stroke="rgba(96,165,250,0.2)" strokeDasharray="5,5">
                        <animateTransform attributeName="transform" type="rotate" from="360 300 150" to="0 300 150" dur="5s" repeatCount="indefinite" />
                    </circle>
                </svg>

                <div style={{ position: 'absolute', bottom: '15px', left: '15px', display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => setBondType('single')}
                        style={{ background: bondType === 'single' ? '#3b82f6' : '#1e293b', border: 'none', padding: '6px 12px', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
                    >Single</button>
                    <button 
                        onClick={() => setBondType('double')}
                        style={{ background: bondType === 'double' ? '#3b82f6' : '#1e293b', border: 'none', padding: '6px 12px', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
                    >Double</button>
                    <button 
                        onClick={() => setBondType('triple')}
                        style={{ background: bondType === 'triple' ? '#3b82f6' : '#1e293b', border: 'none', padding: '6px 12px', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
                    >Triple</button>
                </div>
            </div>
            <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#94a3b8' }}>Dynamic Molecular Bond Length & Strength Visualizer</p>
        </div>
    );
}
