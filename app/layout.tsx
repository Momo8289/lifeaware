import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import CookieConsent from "@/components/CookieConsent";
import { Toaster } from "@/components/ui/toaster";
import { ReminderProvider } from "@/components/providers/ReminderProvider";
import { SettingsApplier } from "@/components/settings-applier";
import { ThemeScript } from "@/components/theme-script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lifeaware",
  description: "Track your habits, set goals, monitor health metrics, and journal your daily activities in one seamless application.",
  icons: {
    icon: '/heart-pulse-color.svg',
    apple: '/heart-pulse-color.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SettingsApplier />
            <ReminderProvider>
              {children}
              <CookieConsent />
              <Toaster />
            </ReminderProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
