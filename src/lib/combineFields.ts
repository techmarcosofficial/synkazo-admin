export type CombineSeparator =
  | 'none'
  | 'space'
  | 'comma'
  | 'comma_space'
  | 'dash'
  | 'slash'
  | 'newline'
  | 'custom';
export type CombineComponent = { type: 'field' | 'text'; value: string };
export interface CombineConfig {
  type: 'combine';
  name?: string;
  separator: CombineSeparator;
  customSeparator?: string;
  components: CombineComponent[];
}

export function combineMappingName(
  config: CombineConfig,
  fields: readonly { key: string; label?: string }[],
  existingNames: readonly string[] = [],
): string {
  const customName = config.name?.trim();
  if (customName) return customName;
  const sourceNames = config.components
    .filter((part) => part.type === 'field' && part.value)
    .map(
      (part) =>
        fields.find((field) => field.key === part.value)?.label || part.value,
    );
  const base = sourceNames.length
    ? sourceNames.join(' + ')
    : 'Combined field 1';
  const used = new Set(existingNames.map((name) => name.toLocaleLowerCase()));
  if (!used.has(base.toLocaleLowerCase())) return base;
  let suffix = 2;
  const prefix = sourceNames.length ? base : 'Combined field';
  while (used.has(`${prefix} ${suffix}`.toLocaleLowerCase())) suffix++;
  return `${prefix} ${suffix}`;
}

const separators: Record<Exclude<CombineSeparator, 'custom'>, string> = {
  none: '',
  space: ' ',
  comma: ',',
  comma_space: ', ',
  dash: ' - ',
  slash: '/',
  newline: '\n',
};

export function previewCombinedFields(
  config: CombineConfig,
  values: Record<string, unknown>,
): string | null {
  const fields = config.components
    .map((component, index) => ({ component, index }))
    .filter(({ component }) => component.type === 'field');
  const resolved = new Map<number, string>();
  for (const { component, index } of fields) {
    const value = values[component.value];
    if (value !== null && value !== undefined && value !== '')
      resolved.set(index, String(value));
  }
  if (resolved.size === 0) return null;
  const emittedText = new Map<number, string>();
  config.components.forEach((component, index) => {
    if (component.type !== 'text') return;
    const leftField = [...fields]
      .reverse()
      .find((field) => field.index < index)?.index;
    const rightField = fields.find((field) => field.index > index)?.index;
    const leftReady = leftField === undefined || resolved.has(leftField);
    const rightReady = rightField === undefined || resolved.has(rightField);
    if (leftReady && rightReady) emittedText.set(index, component.value);
  });
  const separator =
    config.separator === 'custom'
      ? (config.customSeparator ?? '')
      : separators[config.separator];
  const active = fields.filter(({ index }) => resolved.has(index));
  let output = '';
  active.forEach(({ index }, position) => {
    const previous = active[position - 1]?.index;
    if (previous === undefined) {
      output += config.components
        .slice(0, index)
        .map((_, at) => emittedText.get(at) ?? '')
        .join('');
    } else {
      const text = config.components
        .slice(previous + 1, index)
        .map((_, at) => emittedText.get(previous + 1 + at) ?? '')
        .join('');
      output += text || separator;
    }
    output += resolved.get(index);
    if (position === active.length - 1) {
      output += config.components
        .slice(index + 1)
        .map((_, at) => emittedText.get(index + 1 + at) ?? '')
        .join('');
    }
  });
  return output;
}
