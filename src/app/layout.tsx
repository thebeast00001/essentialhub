import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "ESSENTIAL | Your Productivity Command Center",
  description: "Master your time with ESSENTIAL - the high-performance task manager and productivity suite.",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="dark" 
            enableSystem={false}
            themes={['dark', 'light', 'oceanic']}
            value={{
              dark: 'dark',
              light: 'light',
              oceanic: 'oceanic'
            }}
            storageKey="essential-theme"
          >
            <AppLayout>
              {children}
            </AppLayout>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
