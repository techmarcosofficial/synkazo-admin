/** Shared visual boundary for text entry and single-value choice controls. */
export const formControlSurface =
  'bg-card dark:bg-secondary text-foreground rounded-2xl border border-border dark:border-border placeholder:text-muted-foreground dark:hover:border-input transition-[color,box-shadow,background-color,border-color] outline-none';

export const formControlSizes = {
  default: 'h-9 px-3',
  sm: 'h-8 rounded-xl px-2.5',
} as const;

export type FormControlSize = keyof typeof formControlSizes;
