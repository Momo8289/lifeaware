'use client';

import { Suspense } from 'react';
import { HeartPulse } from 'lucide-react';
import Link from "next/link";
import AuthLayout from "../auth-layout";
import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPassword() {
  return (
    <AuthLayout>
      <Link href="/" className="flex items-center gap-2 font-medium hover:text-primary transition-colors mb-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <HeartPulse className="size-4" />
        </div>
        Lifeaware
      </Link>
      
      <div className="w-full">
        <div className="space-y-2 text-center mb-6">
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground">
            Enter your email to receive a password reset link
          </p>
        </div>
        
        <Suspense fallback={<div>Loading...</div>}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </AuthLayout>
  );
}
