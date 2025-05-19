'use client';

import React from 'react';
import { HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
import AuthLayout from '../auth-layout';

export default function SignInPage() {
  return (
    <AuthLayout>
      <Link href="/" className="flex items-center gap-2 font-medium hover:text-primary transition-colors mb-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <HeartPulse className="size-4" />
        </div>
        Lifeaware
      </Link>
      <LoginForm />
    </AuthLayout>
  );
} 