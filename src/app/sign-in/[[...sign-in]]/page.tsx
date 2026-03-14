"use client";

import { SignIn } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";

export default function SignInPage() {
    const { theme } = useTheme();

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, var(--bg-deep) 100%)",
            padding: "24px"
        }}>
            <SignIn 
                routing="hash"
                appearance={{
                    baseTheme: theme === 'light' ? undefined : dark,
                    elements: {
                        card: {
                            boxShadow: "0 20px 80px rgba(0,0,0,0.8)",
                            border: "1px solid var(--border-glass)",
                            backdropFilter: "blur(20px)",
                            background: "var(--bg-card)",
                        },
                        headerTitle: {
                            color: "var(--text-primary)",
                            fontSize: "1.5rem",
                            fontWeight: 800
                        },
                        headerSubtitle: {
                            color: "var(--text-muted)"
                        },
                        formButtonPrimary: {
                            background: "var(--accent-gradient)",
                            border: "none",
                            boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
                        }
                    }
                }}
            />
        </div>
    );
}
