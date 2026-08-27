import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { connectionsApi } from '@/api/connections';
import PageContextAlert from '@/components/shared/PageContextAlert';
import type { Connection } from '@/types';

interface TwoWayAuthNoticeProps {
  projectId: string;
  hubspotConnection: Connection | undefined;
}

// Two-way sync's fast path (webhook-driven reverse leg) only works for
// HubSpot connections authorized via OAuth — HubSpot has no API to manage
// webhook subscriptions for a Private App token. Rather than silently
// degrading to polling-only, tell the user up front so it's not a surprise.
// Shared by both the Create Job wizard and the Job Detail "Sync Direction" tab.
export default function TwoWayAuthNotice({
  projectId,
  hubspotConnection,
}: TwoWayAuthNoticeProps) {
  const [kind, setKind] = useState<string | null>(null);

  useEffect(() => {
    setKind(null);
    if (!hubspotConnection?.id) return;
    let cancelled = false;
    connectionsApi
      .getConnectionPermissions(projectId, hubspotConnection.id)
      .then((res) => {
        if (!cancelled) setKind(res.kind);
      })
      .catch(() => {
        /* best-effort — no notice shown if this fails */
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, hubspotConnection?.id]);

  if (kind !== 'hubspot_private_app') return null;

  return (
    <PageContextAlert
      variant="warning"
      title="Private App connection — no real-time webhook updates"
      description={
        <>
          Changes made in HubSpot will only sync back on the periodic polling
          schedule (not instantly).{' '}
          <Link
            to={`/projects/${projectId}?tab=connections`}
            className="underline hover:no-underline"
          >
            Reconnect via OAuth
          </Link>{' '}
          for faster two-way sync.
        </>
      }
    />
  );
}
