import { useJobDetailContext } from './context';
import { useJobHeaderAlert } from './useJobHeaderAlert';

import PageContextAlert from '@/components/shared/PageContextAlert';
import { cn } from '@/lib/utils';

// Renders the single highest-priority page-context alert for the job detail
// page, below the header/tabs block and above tab content.
export default function JobHeaderAlert() {
  const resolved = useJobHeaderAlert();
  const { highlightStatusGuide, job } = useJobDetailContext();

  if (!resolved) return null;

  return (
    <div
      id="job-contextual-alert"
      tabIndex={-1}
      className={cn(
        'transition-all duration-300 outline-none rounded-2xl',
        highlightStatusGuide &&
          !job.isEnabled &&
          'ring-primary animate-alert-shake ring-2 ring-offset-2',
      )}
    >
      <PageContextAlert
        variant={resolved.variant}
        title={resolved.title}
        description={resolved.description}
        icon={resolved.icon}
        actions={resolved.actions}
        dismissKey={resolved.id}
      />
    </div>
  );
}
