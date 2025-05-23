import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import CookieConsent from "@/components/CookieConsent";
import { Toaster } from "@/components/ui/toaster";
import { ReminderProvider } from "@/components/providers/ReminderProvider";

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
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
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
