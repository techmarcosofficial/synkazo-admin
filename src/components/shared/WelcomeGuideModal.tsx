import { RefreshCw, FolderOpen, Zap, CheckCircle } from 'lucide-react';
import { useState } from 'react';

import FormDialog from '@/components/form/FormDialog';
import HeadingPair from '@/components/shared/HeadingPair';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    icon: RefreshCw,
    heading: 'Welcome to Synkazo',
    body: 'Synkazo synchronizes your field service software and CRM automatically. No manual exports or duplicate entry — just secure, continuous data synchronization.',
  },
  {
    icon: FolderOpen,
    heading: 'Integration Projects',
    body: 'Projects represent a dedicated sync channel between your software platforms (e.g. ServiceTitan & HubSpot). Connect your credentials securely to get started.',
  },
  {
    icon: Zap,
    heading: 'Sync Flows & Field Mappings',
    body: 'Define exactly what moves between platforms (e.g. Customers → Contacts). Map fields with visual auto-matching, set fallback defaults, and apply filters.',
  },
  {
    icon: CheckCircle,
    heading: 'Sample Tests & Automation',
    body: 'Run a 5-record sample test in Sandbox to preview changes safely, then set an automated schedule to sync in real time. Everything is ready in your dashboard.',
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
        <HeadingPair title={heading} subtitle={body} className="items-center" />
      </div>
    </FormDialog>
  );
}
