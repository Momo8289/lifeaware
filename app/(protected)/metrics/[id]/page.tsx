import { Suspense } from 'react';
import MetricDetailClient from './MetricDetailClient';

export default async function MetricDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  
  return (
    <Suspense fallback={<div className="container py-6">Loading...</div>}>
      <MetricDetailClient id={resolvedParams.id} />
    </Suspense>
  );
} 