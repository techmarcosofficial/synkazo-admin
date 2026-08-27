import PageContextAlert from '@/components/shared/PageContextAlert';
import { usePlanQuery } from '@/queries/useBilling';

/**
 * Soft-lock notice shown when an org holds more resources than its current plan allows
 * (e.g. after a downgrade). Backend already blocks new creation / extra runs; this just
 * tells the user why and how to resolve it. Non-dismissible — reflects an unresolved
 * account-level state, not a transient page condition.
 */
export default function OverLimitBanner() {
  const { data } = usePlanQuery();
  if (!data?.overLimit?.isOverLimit) return null;
  const over = data.overLimit;

  const parts: string[] = [];
  if (over.projects.over)
    parts.push(
      `${over.projects.count} projects (limit ${over.projects.limit})`,
    );
  if (over.jobs.over)
    parts.push(`${over.jobs.count} sync jobs (limit ${over.jobs.limit})`);
  if (over.teamMembers.over)
    parts.push(
      `${over.teamMembers.count} team members (limit ${over.teamMembers.limit})`,
    );

  return (
    <PageContextAlert
      variant="warning"
      className="mb-4"
      title={`You're over your ${data.planName} plan limit`}
      description={
        <>
          You currently have {parts.join(', ')}. New creation and syncing on the
          extra items are paused.{' '}
          <a
            href={`${import.meta.env.VITE_MARKETING_URL}/pricing`}
            className="text-primary hover:underline"
          >
            Upgrade
          </a>{' '}
          or remove the extras to resume.
        </>
      }
    />
  );
}
