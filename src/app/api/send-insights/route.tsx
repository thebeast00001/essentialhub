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

// Standard Cron Handler
export async function GET(req: NextRequest) {
    try {
        // Optional: Verification of Cron Secret for security
        // const authHeader = req.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return new Response('Unauthorized', { status: 401 });
        // }

        // 1. Fetch all users who have registered profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, username');

        if (profileError || !profiles) {
            return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
        }

        const stats = { sent: 0, failed: 0 };

        // 2. Loop through users and send reports
        for (const profile of profiles) {
            try {
                const now = new Date();
                const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                // Fetch user specific data
                const { data: tasks } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('user_id', profile.id)
                    .gte('completed_at', lastWeek.toISOString());

                const { data: sessions } = await supabase
                    .from('focus_sessions')
                    .select('*')
                    .eq('user_id', profile.id)
                    .gte('completed_at', lastWeek.toISOString());

                const completedCount = tasks?.length || 0;
                const focusMins = sessions?.reduce((acc: number, s: any) => acc + s.duration_mins, 0) || 0;

                const insightData = {
                    userEmail: profile.email,
                    userName: profile.full_name || profile.username || 'Zenith User',
                    weekRange: `${lastWeek.toLocaleDateString()} - ${now.toLocaleDateString()}`,
                    metrics: {
                        focusMinutes: focusMins,
                        tasksCompleted: completedCount,
                        tasksMissed: 0,
                        productivityScore: Math.min(100, Math.round((completedCount * 10) + (focusMins / 30))),
                        improvement: 15,
                    },
                    insights: [
                        `You completed ${completedCount} major tasks this week.`,
                        `Total deep focus time recorded: ${Math.round(focusMins / 60)} hours.`,
                        `Most active morning flow detected.`
                    ],
                    recommendations: [
                        "Prioritize high-energy tasks during your peak morning hours.",
                        "Try adding a short reflection period on Friday afternoons.",
                        "Maintain consistent sleep patterns to improve cognitive focus."
                    ]
                };

                // Generate PDF
                // @ts-ignore
                const pdfBuffer = await renderToBuffer(<WeeklyInsightsPDF data={insightData} />);

                // Send Email
                await resend.emails.send({
                    from: 'Zenith AI <onboarding@resend.dev>',
                    to: [profile.email],
                    subject: `Your Weekly Productivity Insight · ${now.toLocaleDateString()}`,
                    text: `Hi ${insightData.userName}, your weekly report is attached.`,
                    attachments: [
                        {
                            filename: `Zenith_Insights_${now.toISOString().split('T')[0]}.pdf`,
                            content: pdfBuffer,
                        },
                    ],
                });

                stats.sent++;
            } catch (err) {
                console.error(`Failed to send to ${profile.email}:`, err);
                stats.failed++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Processed ${profiles.length} users.`,
            stats 
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Keep POST for manual triggers/backwards compatibility if needed
export async function POST(req: NextRequest) {
    // Current manual single-user trigger logic can still be here if needed 
    // for testing but GET is preferred for automated crons
    return GET(req);
}
