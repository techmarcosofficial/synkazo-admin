const FIELD =
  /^(\*|[0-9]+(-[0-9]+)?)(\/[0-9]+)?(,(\*|[0-9]+(-[0-9]+)?)(\/[0-9]+)?)*$/;

export function isValidCronExpression(expr: unknown): boolean {
  if (typeof expr !== 'string') return false;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => FIELD.test(p));
}
