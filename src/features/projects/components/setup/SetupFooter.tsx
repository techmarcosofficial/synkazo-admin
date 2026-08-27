import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export interface FooterAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface SetupFooterProps {
  left: FooterAction;
  right?: FooterAction;
}

export default function SetupFooter({ left, right }: SetupFooterProps) {
  return (
    <div className="flex items-center justify-between border-t px-4 py-4">
      <Button
        variant="outline"
        onClick={left.onClick}
        disabled={left.disabled || left.loading}
      >
        {left.label}
      </Button>
      {right && (
        <Button
          onClick={right.onClick}
          disabled={right.disabled || right.loading}
        >
          {right.loading ? <Spinner /> : null}
          {right.label} {!right.loading && <ArrowRight />}
        </Button>
      )}
    </div>
  );
}
