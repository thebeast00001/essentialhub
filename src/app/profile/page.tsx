'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user?.id) {
            router.replace(`/profile/${user.id}`);
        } else if (!loading && !user) {
            router.push('/sign-in');
        }
    }, [user, loading, router]);

    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '100vh',
            background: 'var(--bg-deep)',
            color: 'var(--text-muted)',
            fontFamily: 'inherit'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '3px solid rgba(255,255,255,0.1)', 
                    borderTopColor: 'var(--accent-primary)', 
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }} />
                <p>Establishing secure pulse connection...</p>
                <style jsx>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
}

