import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { RadioGroupItem } from '@/components/ui/radio-group';

// The shadcn/ui "Choice Card" pattern: FieldLabel's own styling turns the
// whole label into a bordered, selectable card when it wraps a Field
// containing a checked control (see field.tsx's has-data-checked classes) —
// composition only, no custom visual system. Reused by every RadioGroup in
// the Create Sync Job wizard, so it's pulled out once instead of repeated.
export function ChoiceCardItem({
  value,
  id,
  title,
  description,
  disabled,
}: {
  value: string;
  id: string;
  title: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <FieldLabel
      htmlFor={id}
      className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
    >
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          {description && <FieldDescription>{description}</FieldDescription>}
        </FieldContent>
        <RadioGroupItem value={value} id={id} disabled={disabled} />
      </Field>
    </FieldLabel>
  );
}
