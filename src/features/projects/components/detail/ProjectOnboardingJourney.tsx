import { useRef } from 'react';

import { useProjectDetailContext } from './context';

import SetupJourneyCard, {
  type SetupJourneyStep,
} from '@/features/onboarding/components/SetupJourneyCard';
import {
  selectContextualSetupAction,
  selectProjectOnboardingStage,
} from '@/features/onboarding';

export default function ProjectOnboardingJourney() {
  const { hasBothConnections, hasJobs, activeTab, handleTabChange } =
    useProjectDetailContext();
  const stage = selectProjectOnboardingStage({
    hasBothConnections,
    hasJobs,
  });
  const completeOnMount = useRef(stage === 'complete');

  if (stage === 'complete' && completeOnMount.current) return null;

  const isConnecting = stage === 'connect_platforms';
  const steps: SetupJourneyStep[] = [
    {
      title: 'Connect Platforms',
      description: 'Connect the source and destination for this project.',
      status: isConnecting ? 'current' : 'complete',
      onSelect: () => handleTabChange('connections'),
    },
    {
      title: 'Create First Sync Job',
      description: 'Choose what data should move between your platforms.',
      status:
        stage === 'complete'
          ? 'complete'
          : isConnecting
            ? 'upcoming'
            : 'current',
    },
  ];

  if (stage === 'complete') {
    return (
      <SetupJourneyCard
        eyebrow="Project setup complete"
        title="Your project is ready"
        description="Both platforms are connected and your first sync job has been created."
        steps={steps}
        actionLabel="Go to project overview"
        onContinue={() => handleTabChange('overview')}
      />
    );
  }

  const targetTab = isConnecting ? 'connections' : 'sync-rules';
  const action = selectContextualSetupAction({
    activePage: activeTab,
    targetPage: targetTab,
    previousPage: stage === 'create_first_job' ? 'connections' : null,
  });

  if (action === 'none') return null;

  return (
    <SetupJourneyCard
      eyebrow="Project setup"
      title={
        isConnecting
          ? 'Connect your source and destination'
          : 'Your connections are ready'
      }
      description={
        isConnecting
          ? 'Both connections must be ready before you can create a sync job.'
          : 'Create a sync job to choose what data should move between your platforms.'
      }
      steps={steps}
      actionLabel={action === 'next' ? 'Next' : 'Continue setup'}
      onContinue={() => handleTabChange(targetTab)}
    />
  );
}
