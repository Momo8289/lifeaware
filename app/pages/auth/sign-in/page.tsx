'use client';

import React, { useEffect, useState } from 'react';
import { HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
import AuthLayout from '../auth-layout';

export default function SignInPage() {
  const [message, setMessage] = useState<string | null>(null);
  
  useEffect(() => {
    // Get message from URL safely on the client side
    const urlParams = new URLSearchParams(window.location.search);
    const messageParam = urlParams.get('message');
    if (messageParam) {
      setMessage(messageParam);
    }
  }, []);
  
  return (
    <AuthLayout>
      <Link href="/public" className="flex items-center gap-2 font-medium hover:text-primary transition-colors mb-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <HeartPulse className="size-4" />
        </div>
        Lifeaware
      </Link>
      <LoginForm message={message} />
    </AuthLayout>
  );
} 