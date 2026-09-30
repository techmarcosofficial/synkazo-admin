/** Shared visual boundary for text entry and single-value choice controls. */
export const formControlSurface =
  'bg-card dark:bg-input/50 rounded-2xl border border-border transition-[color,box-shadow,background-color] outline-none';

export const formControlSizes = {
  default: 'h-9 px-3',
  sm: 'h-8 rounded-xl px-2.5',
} as const;

export type FormControlSize = keyof typeof formControlSizes;
