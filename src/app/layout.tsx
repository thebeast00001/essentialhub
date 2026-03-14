import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "ESSENTIAL | Your Productivity Command Center",
  description: "Master your time with ESSENTIAL - the high-performance task manager and productivity suite.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#6366f1',
          colorBackground: '#121316',
          colorInputBackground: 'rgba(255, 255, 255, 0.05)',
          colorInputText: '#fff',
          borderRadius: '16px',
        },
        elements: {
          card: {
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            background: 'rgba(20, 22, 25, 0.8)',
          },
          navbar: {
            display: 'none',
          },
          headerTitle: {
            fontWeight: 800,
            fontSize: '1.5rem',
            background: 'linear-gradient(135deg, #fff 0%, #a5a5a5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          },
          headerSubtitle: {
            color: 'rgba(255,255,255,0.5)'
          },
          socialButtonsBlockButton: {
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s',
            '&:hover': {
              background: 'rgba(255,255,255,0.05)'
            }
          },
          formButtonPrimary: {
            backgroundImage: 'var(--accent-gradient)',
            border: 'none',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(99, 102, 241, 0.6)',
            }
          }
        }
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
            <AppLayout>
              {children}
            </AppLayout>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
