'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    // Silent error handling for production.toISOString(),
    });

    // TODO: Send to error tracking service (e.g., Sentry, LogRocket, etc.)
    // Example:
    // if (typeof window !== 'undefined' && window.analytics) {
    //   window.analytics.track('Application Error', {
    //     error: error.message,
    //     digest: error.digest,
    //     stack: error.stack,
    //   });
    // }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <h1 className="text-4xl font-bold tracking-tighter mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        We encountered an unexpected error. Please try again later or contact support if the issue persists.
      </p>
      <div className="flex gap-4">
        <Button onClick={reset}>Try again</Button>
        <Link href="/">
          <Button variant="outline">Go back home</Button>
        </Link>
      </div>
    </div>
  );
}