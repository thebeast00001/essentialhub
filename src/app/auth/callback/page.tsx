"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import { AuthLogo } from '@/components/auth/AuthLogo';
import { DigitalRain } from '@/components/auth/DigitalRain';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleAuthCallback = async () => {
            const { error } = await supabase.auth.getSession();
            if (!error) {
                router.push('/');
            } else {
                console.error('Auth callback error:', error);
                router.push('/sign-in');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <DigitalRain />
            <AuthLogo />
            <div style={{ opacity: 0.5, letterSpacing: '0.2em', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                Synchronizing Identity
            </div>
        </div>
    );
}

