import { Check, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const ENVIRONMENTS = [
  {
    id: 'sandbox',
    label: 'Sandbox',
    tone: 'bg-warning',
    border: 'border-warning',
  },
  {
    id: 'production',
    label: 'Production',
    tone: 'bg-success',
    border: 'border-success',
  },
] as const;

interface ConnectionEnvDropdownProps {
  activeEnv: string;
  onChange: (env: string) => void;
  projectActiveEnv?: string | null;
  envHasAnyConnected: (env: string) => boolean;
  envFullyConnected: (env: string) => boolean;
}

export default function ConnectionEnvDropdown({
  activeEnv,
  onChange,
  projectActiveEnv,
  envHasAnyConnected,
  envFullyConnected,
}: ConnectionEnvDropdownProps) {
  const active =
    ENVIRONMENTS.find((e) => e.id === activeEnv) ?? ENVIRONMENTS[0];

  const isProjectActive =
    projectActiveEnv === active.id && envFullyConnected(active.id);

  return (
    <div className="flex items-center gap-2.5 rounded-3xl border p-0.5 pr-1 pl-3">
      <p className="text-muted-foreground text-sm">Configure connection on</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-2">
            <span
              className={cn(
                'size-2 rounded-full',
                isProjectActive
                  ? active.tone
                  : envHasAnyConnected(active.id)
                    ? cn('border-2 bg-transparent', active.border)
                    : 'bg-border',
              )}
            />

            <span>{active.label}</span>

            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {ENVIRONMENTS.map((env) => {
            const isActive =
              projectActiveEnv === env.id && envFullyConnected(env.id);

            const hasAny = envHasAnyConnected(env.id);

            return (
              <DropdownMenuItem key={env.id} onClick={() => onChange(env.id)}>
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

                {activeEnv === env.id && <Check className="size-4" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
