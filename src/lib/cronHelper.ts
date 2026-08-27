const CRON_LABELS: Record<string, string> = {
  '*/15 * * * *': 'Every 15 minutes',
  '0 * * * *': 'Every hour',
  '0 */2 * * *': 'Every 2 hours',
  '0 */6 * * *': 'Every 6 hours',
  '0 0 * * *': 'Daily at midnight',
  '0 9 * * *': 'Daily at 9am',
  '0 9 * * 1': 'Weekly on Monday',
};

export function cronToLabel(expression: string | null | undefined): string {
  if (!expression) return 'Not scheduled';
  return CRON_LABELS[expression] ?? expression;
}
