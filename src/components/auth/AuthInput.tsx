import { type LucideIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';

interface AuthInputProps extends React.ComponentProps<typeof Input> {
  icon: LucideIcon;
}

export default function AuthInput({ icon: Icon, ...props }: AuthInputProps) {
  return (
    <InputGroup className="synkazo-auth-input-group">
      <InputGroupAddon align="inline-start" aria-hidden="true">
        <Icon />
      </InputGroupAddon>
      <InputGroupInput {...props} />
    </InputGroup>
  );
}
