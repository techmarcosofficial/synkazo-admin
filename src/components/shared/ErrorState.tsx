import { AlertTriangle, RefreshCw } from 'lucide-react';

import EmptyState from '@/components/shared/EmptyState';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

// Shared "something went wrong" state for failed queries — wraps EmptyState
// so error UI shares the same shell as the empty-state UI.
export default function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't load this data. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      action={
        onRetry ? { label: 'Retry', icon: RefreshCw, onClick: onRetry } : null
      }
    />
  );
}
