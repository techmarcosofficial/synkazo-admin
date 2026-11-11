import { useJobSetupGuide } from './useJobSetupGuide';

import SetupProgressIndicator from '@/features/onboarding/components/SetupProgressIndicator';

export default function JobSetupProgress({
  className,
}: {
  className?: string;
}) {
  return (
    <SetupProgressIndicator guide={useJobSetupGuide()} className={className} />
  );
}
