import { Check, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { ProjectEnvironment } from '@/types';

const ENVIRONMENTS = [
  {
    id: 'sandbox' as ProjectEnvironment,
    label: 'Test Mode',
    tone: 'bg-warning',
    border: 'border-warning',
  },
  {
    id: 'production' as ProjectEnvironment,
    label: 'Production',
    tone: 'bg-success',
    border: 'border-success',
  },
] as const;

interface EnvironmentToggleProps {
  projectActiveEnv: ProjectEnvironment | null;
  envActivating: boolean;
  envDiffLoading: boolean;
  envFullyConnected: (env: string) => boolean;
  envHasAnyConnected: (env: string) => boolean;
  onActivate: (env: ProjectEnvironment) => void;
}

export default function EnvironmentToggle({
  projectActiveEnv,
  envActivating,
  envDiffLoading,
  envFullyConnected,
  envHasAnyConnected,
  onActivate,
}: EnvironmentToggleProps) {
  const isBusy = envActivating || envDiffLoading;

  const active =
    ENVIRONMENTS.find(
      (env) => env.id === projectActiveEnv && envFullyConnected(env.id),
    ) ?? ENVIRONMENTS[0];

  return (
    <div className="bg-card text-muted-foreground flex items-center gap-2.5 rounded-3xl border p-0.5 pr-1 pl-3 text-sm font-medium">
      <p className="text-muted-foreground text-sm">Syncs run on</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            disabled={isBusy}
            className="rounded-2xl"
          >
            {isBusy ? (
              <Spinner className="size-3" />
            ) : (
              <span className={cn('size-2 rounded-full', active.tone)} />
            )}

            {active.label}

            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {ENVIRONMENTS.map((env) => {
            const isActive =
              projectActiveEnv === env.id && envFullyConnected(env.id);

            const hasAny = envHasAnyConnected(env.id);

            return (
              <DropdownMenuItem
                key={env.id}
                disabled={!envFullyConnected(env.id) || isBusy}
                onClick={() => onActivate(env.id)}
              >
                <span
                  className={cn(
                    'mr-2 size-2 rounded-full',
                    isActive
                      ? env.tone
                      : hasAny
                        ? cn('border-2 bg-transparent', env.border)
                        : 'bg-border',
                  )}
                />

                <span className="flex-1">{env.label}</span>

                {isActive && <Check className="size-4" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
