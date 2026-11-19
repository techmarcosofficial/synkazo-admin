import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const DEFAULT_CONFIRM_WORD = 'DELETE';

interface TypeToConfirmFieldProps {
  /** The word the operator must type to confirm (default "DELETE"). */
  word?: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  autoFocus?: boolean;
  className?: string;
}

// A confirmation input locked to a single word. The full word is always shown
// as a faint "ghost" the operator types over: the typed prefix stays in the
// normal colour while the remaining letters sit behind in a muted colour. Only
// input that keeps the value a prefix of the word is accepted — wrong
// characters, or anything typed past the word, are ignored and never printed.
export function TypeToConfirmField({
  word = DEFAULT_CONFIRM_WORD,
  value,
  onChange,
  id,
  autoFocus,
  className,
}: TypeToConfirmFieldProps) {
  const target = word.toUpperCase();

  const handleChange = (raw: string) => {
    const next = raw.toUpperCase();
    if (target.startsWith(next)) {
      onChange(next);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center px-3 text-base tracking-normal md:text-sm"
      >
        <span className="invisible whitespace-pre">{value}</span>
        <span className="whitespace-pre text-muted-foreground/40">
          {target.slice(value.length)}
        </span>
      </div>
      <Input
        id={id}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={target.length}
        onChange={(e) => handleChange(e.target.value)}
        className="relative bg-transparent tracking-normal dark:bg-transparent"
      />
    </div>
  );
}

// Convenience matcher so callers don't re-implement the comparison.
export function isConfirmWordMatched(
  value: string,
  word: string = DEFAULT_CONFIRM_WORD,
): boolean {
  return value.toUpperCase() === word.toUpperCase();
}
