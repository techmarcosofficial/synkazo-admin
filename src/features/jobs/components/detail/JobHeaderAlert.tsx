import { useJobHeaderAlert } from './useJobHeaderAlert';

import PageContextAlert from '@/components/shared/PageContextAlert';

// Renders the single highest-priority page-context alert for the job detail
// page, below the header/tabs block and above tab content.
export default function JobHeaderAlert() {
  const resolved = useJobHeaderAlert();

  if (!resolved) return null;

  return (
    <PageContextAlert
      variant={resolved.variant}
      title={resolved.title}
      description={resolved.description}
      icon={resolved.icon}
      actions={resolved.actions}
      dismissKey={resolved.id}
    />
  );
}
