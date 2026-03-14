"use client";

import { SignUp } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Dices, User } from "lucide-react";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";

// Essential-style auto-generated usernames
const ADJECTIVES = ["Essential", "Absolute", "Core", "Pure", "Primal", "Zen", "Active", "Focus", "High", "Elite"];
const NOUNS = ["Mind", "Soul", "Stream", "Drift", "Logic", "Force", "Path", "Orbit", "Drive", "Focus"];

const generateUsername = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    const timestamp = Date.now().toString().slice(-3); // Last 3 digits of timestamp for extra safety
    return `${adj}${noun}${randomNum}${timestamp}`;
};

export default function SignUpPage() {
    const { theme } = useTheme();
    const [step, setStep] = useState<"username" | "clerk">("username");
    const [suggestedUsername, setSuggestedUsername] = useState("");

    useEffect(() => {
        setSuggestedUsername(generateUsername());
    }, []);

    const reroll = () => {
        setSuggestedUsername(generateUsername());
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, var(--bg-deep) 100%)",
            padding: "24px"
        }}>
            <AnimatePresence mode="wait">
                {step === "username" ? (
                    <motion.div
                        key="username-step"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                        transition={{ duration: 0.4 }}
                        style={{
                            background: "var(--bg-card)",
                            backdropFilter: "blur(20px)",
                            border: "1px solid var(--border-strong)",
                            padding: "48px",
                            borderRadius: "24px",
                            boxShadow: "var(--shadow-lg)",
                            textAlign: "center",
                            maxWidth: "480px",
                            width: "100%"
                        }}
                    >
                        <div style={{
                            width: "64px", height: "64px", borderRadius: "50%",
                            background: "rgba(99,102,241,0.1)", color: "var(--accent-primary)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 24px auto"
                        }}>
                            <Sparkles size={32} />
                        </div>

                        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "16px", color: "var(--text-primary)" }}>
                            ESSENTIAL Identity
                        </h1>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "32px", lineHeight: 1.6 }}>
                            Before you enter the workspace, let's establish your alias. We've generated a unique identity for you.
                        </p>

                        <div style={{
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "16px",
                            padding: "24px",
                            marginBottom: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <User style={{ color: "var(--accent-primary)" }} size={24} />
                                <span style={{ fontSize: "1.5rem", fontWeight: 700, whiteSpace: "nowrap", color: "var(--text-primary)", letterSpacing: "1px" }}>
                                    {suggestedUsername}
                                </span>
                            </div>
                            <button
                                onClick={reroll}
                                style={{
                                    background: "transparent", border: "1px solid var(--border-strong)",
                                    color: "var(--text-primary)", padding: "8px", borderRadius: "8px", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s"
                                }}
                                title="Reroll Username"
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                <Dices size={20} />
                            </button>
                        </div>

                        <button
                            onClick={() => setStep("clerk")}
                            style={{
                                width: "100%", padding: "16px", borderRadius: "12px", border: "none",
                                background: "var(--accent-gradient)", color: "white", fontSize: "1.1rem",
                                fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center",
                                justifyContent: "center", gap: "8px", boxShadow: "0 10px 30px rgba(99,102,241,0.3)",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                        >
                            Claim Identity <ArrowRight size={20} />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="clerk-step"
                        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* 
                            Pass the generated username to Clerk.
                            Note: Depending on Clerk settings, the user might still need to enter an email. 
                        */}
                        <SignUp 
                            initialValues={{ username: suggestedUsername }} 
                            routing="hash" 
                            appearance={{
                                baseTheme: dark,
                                elements: {
                                    card: {
                                        boxShadow: "0 20px 80px rgba(0,0,0,0.8)",
                                        border: "1px solid var(--border-strong)",
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
