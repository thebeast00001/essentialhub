import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { WeeklyInsightsPDF } from '@/components/insights/WeeklyInsightsPDF';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Standard Cron Handler with Batching Support
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // 1. Fetch profiles for this batch
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, username')
            .range(offset, offset + limit - 1);

        if (profileError || !profiles) {
            return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
        }

        if (profiles.length === 0) {
            return NextResponse.json({ success: true, message: 'No profiles to process in this range.' });
        }

        const stats = { sent: 0, failed: 0 };
        const userIds = profiles.map(p => p.id);

        // 2. Fetch all tasks and sessions for the entire batch in one go (Optimized)
        const now = new Date();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const { data: allTasks } = await supabase
            .from('tasks')
            .select('*')
            .in('user_id', userIds);

        const { data: allSessions } = await supabase
            .from('focus_sessions')
            .select('*')
            .in('user_id', userIds);

        // 3. Group data by user_id for O(1) lookup during processing
        const tasksByUser = (allTasks || []).reduce((acc: any, t: any) => {
            if (!acc[t.user_id]) acc[t.user_id] = [];
            acc[t.user_id].push(t);
            return acc;
        }, {});

        const sessionsByUser = (allSessions || []).reduce((acc: any, s: any) => {
            if (!acc[s.user_id]) acc[s.user_id] = [];
            acc[s.user_id].push(s);
            return acc;
        }, {});

        // 4. Process the batch
        for (const profile of profiles) {
            try {
                const userTasks = tasksByUser[profile.id] || [];
                const userSessions = sessionsByUser[profile.id] || [];

                const currentTasks = userTasks.filter((t: any) => t.completed && t.completed_at && new Date(t.completed_at) >= weekStart);
                const currentSessions = userSessions.filter((s: any) => s.completed_at && new Date(s.completed_at) >= weekStart);
                
                const focusMins = currentSessions.reduce((acc: number, s: any) => acc + (s.duration_mins || 0), 0);
                const completedCount = currentTasks.length;

                // Accurate Missed Tasks
                const missedTasks = userTasks.filter((t: any) => {
                    if (!t.deadline || t.completed) return false;
                    const d = new Date(t.deadline);
                    return d >= weekStart && d <= now;
                }).length;

                const productivityScore = Math.min(100, Math.round((completedCount / 5 * 50) + (focusMins / 120 * 50)));

                // Focus Streak
                const uniqueDays = Array.from(new Set(
                    (userSessions || []).map((s: any) => s.completed_at?.split('T')[0])
                )).filter(Boolean).sort().reverse();
                
                let streak = 0;
                if (uniqueDays.length > 0) {
                    let curr = new Date(uniqueDays[0] as string);
                    for (const d of uniqueDays) {
                        if (d === (curr.toISOString().split('T')[0])) {
                            streak++;
                            curr.setDate(curr.getDate() - 1);
                        } else break;
                    }
                }

                const insightData = {
                    userEmail: profile.email,
                    userName: profile.full_name || profile.username || 'Zenith User',
                    weekRange: `${weekStart.toLocaleDateString()} - ${now.toLocaleDateString()}`,
                    metrics: {
                        focusMinutes: focusMins,
                        tasksCompleted: completedCount,
                        tasksMissed: missedTasks,
                        productivityScore: productivityScore,
                        improvement: streak,
                    },
                    insights: [
                        `You crushed ${completedCount} major objectives this week.`,
                        `Deep work intensity: ${Math.round(focusMins / 60)} hours of flow state.`,
                        streak > 2 ? `Impressive ${streak}-day focus streak maintained!` : 'Consistency is building. You have the momentum.'
                    ],
                    recommendations: [
                        "Review your peak productivity periods in the Zenith Dashboard.",
                        "Clear your backlog items early in the week for maximum momentum.",
                        "Your performance score shows you're ready for more complex challenges."
                    ]
                };

                // Generate PDF
                const pdfBuffer = await renderToBuffer(<WeeklyInsightsPDF data={insightData} />);

                // Send Email
                await resend.emails.send({
                    from: 'Zenith AI <onboarding@resend.dev>',
                    to: [profile.email],
                    subject: `Weekly Performance Analysis · ${now.toLocaleDateString()}`,
                    text: `Hi ${insightData.userName}, your performance report is ready. You hit a ${streak}-day streak!`,
                    attachments: [
                        {
                            filename: `Zenith_Weekly_${now.toISOString().split('T')[0]}.pdf`,
                            content: pdfBuffer,
                        },
                    ],
                });

                stats.sent++;
            } catch (err) {
                console.error(`Failed to send report to ${profile.email}:`, err);
                stats.failed++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Processed ${profiles.length} users (Offset: ${offset}).`,
            stats 
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Keep POST for manual triggers/backwards compatibility
export async function POST(req: NextRequest) {
    return GET(req);
}
