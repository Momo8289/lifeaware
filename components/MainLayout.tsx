'use client';

import React from 'react';
import Link from 'next/link';
import { ThemeSwitcher } from './theme-switcher';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { HeartPulse } from 'lucide-react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-bold text-xl flex items-center gap-2 hover:text-primary transition-colors">
            <HeartPulse className="h-6 w-6" />
            <span>Lifeaware</span>
          </Link>
          <nav className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
                  Dashboard
                </Link>
                <form action="/auth/sign-out" method="post">
                  <Button variant="ghost" className="text-sm font-medium">
                    Sign Out
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/sign-in">
                  <Button variant="ghost" className="text-sm font-medium">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="text-sm font-medium">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
            <ThemeSwitcher />
          </nav>
        </div>
      </header>
      <main className="flex-1 container py-6">
        {children}
      </main>
      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lifeaware. All rights reserved.
          </p>
          <nav className="flex gap-4">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">
              Terms of Service
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
} 