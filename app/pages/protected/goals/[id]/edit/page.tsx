import EditGoalClient from './edit-goal-client';

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <EditGoalClient goalId={resolvedParams.id} />
  );
} 