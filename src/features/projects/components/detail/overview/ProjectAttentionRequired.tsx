import { PageContextAlert } from '../shared';

import type { ProjectDetailTabId } from '@/features/projects/lib/projectDetailTabs';
import type { ProjectHealthIssue } from '@/features/projects/lib/projectSetupState';

interface ProjectAttentionRequiredProps {
  issues: ProjectHealthIssue[];
  onIssueClick: (tab: ProjectDetailTabId) => void;
}

export default function ProjectAttentionRequired({
  issues,
  onIssueClick,
}: ProjectAttentionRequiredProps) {
  if (issues.length === 0) return null;

  const variant = issues.some((i) => i.severity === 'danger')
    ? 'error'
    : 'warning';

  return (
    <PageContextAlert
      variant={variant}
      title="Attention required"
      description={
        <ul className="space-y-1">
          {issues.map((issue) => (
            <li key={issue.message}>
              <button
                type="button"
                onClick={() => onIssueClick(issue.tab)}
                className="text-left underline-offset-2 hover:underline"
              >
                {issue.message}
              </button>
            </li>
          ))}
        </ul>
      }
    />
  );
}
