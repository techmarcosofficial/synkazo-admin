import { RefreshCw, FolderOpen, Zap, CheckCircle } from 'lucide-react';
import { useState } from 'react';

import FormDialog from '@/components/form/FormDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    icon: RefreshCw,
    heading: 'Welcome to synkazo',
    body: 'synkazo keeps your ServiceTitan and HubSpot data in sync automatically. No manual exports, no duplicate data entry — just clean, automated sync between your platforms.',
  },
  {
    icon: FolderOpen,
    heading: 'Projects are your sync workspaces',
    body: 'A Project represents one data flow between ServiceTitan and HubSpot. Create a project, connect your accounts, and it becomes the home for all your sync jobs and logs.',
  },
  {
    icon: Zap,
    heading: 'Jobs do the syncing',
    body: 'Inside a project, Sync Jobs define what gets synced — for example, ServiceTitan Customers → HubSpot Contacts. Map your fields, set a schedule, and synkazo handles the rest.',
  },
  {
    icon: CheckCircle,
    heading: "You're all set",
    body: 'Head to Projects to create your first project, connect your platforms, and set up a sync job. Everything you need is in the sidebar.',
  },
];

interface WelcomeGuideModalProps {
  onClose: () => void;
}

export default function WelcomeGuideModal({ onClose }: WelcomeGuideModalProps) {
  const [step, setStep] = useState(0);
  const { icon: Icon, heading, body } = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleClose = () => {
    localStorage.setItem('sb_onboarding_done', 'true');
    onClose();
  };

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && handleClose()}
      title="Getting Started"
      description={`Step ${step + 1} of ${STEPS.length}`}
      size="sm"
      preventOutsideClose={false}
      footer={
        <div className="flex w-full items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={() => (isLast ? handleClose() : setStep((s) => s + 1))}
          >
            {isLast ? 'Get Started' : 'Next'}
          </Button>
        </div>
      }
    >
      <div className="flex justify-center gap-2 pb-6">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === step ? 'bg-primary w-6' : 'bg-border w-2',
            )}
          />
        ))}
      </div>

      <div
        key={step}
        className="animate-in fade-in-0 slide-in-from-right-2 flex flex-col items-center gap-4 text-center duration-200"
      >
        <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
          <Icon className="size-7" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-medium">{heading}</h2>
          <p className="text-muted-foreground mt-1.5 leading-relaxed">{body}</p>
        </div>
      </div>
    </FormDialog>
  );
}
