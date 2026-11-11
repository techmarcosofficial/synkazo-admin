import { useProjectSetupGuide } from './useProjectSetupGuide';

import SetupProgressIndicator from '@/features/onboarding/components/SetupProgressIndicator';

export default function ProjectSetupProgress({
  className,
}: {
  className?: string;
}) {
  return (
    <SetupProgressIndicator
      guide={useProjectSetupGuide()}
      className={className}
    />
  );
}
