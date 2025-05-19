'use client';

import React from 'react';
import Link from 'next/link';
import { HeartPulse } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Link href="/" className="font-bold text-xl flex items-center gap-2 hover:text-primary transition-colors">
            <HeartPulse className="h-6 w-6" />
            <span>Lifeaware</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          {children}
        </div>
      </main>
    </div>
  );
} 