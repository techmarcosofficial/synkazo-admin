/** Visual hierarchy is independent of the semantic heading element. */
export type HeadingVisualLevel = 'page' | 'section' | 'card' | 'item';

export const headingTitleStyles: Record<HeadingVisualLevel, string> = {
  page: 'text-lg leading-7 font-bold',
  section: 'text-base leading-6 font-semibold',
  card: 'text-sm leading-5 font-semibold',
  item: 'text-[13px] leading-[18px] font-semibold',
};

export const headingSubtitleStyles: Record<HeadingVisualLevel, string> = {
  page: 'text-sm leading-5 font-normal',
  section: 'text-sm leading-5 font-normal',
  card: 'text-xs leading-[18px] font-normal',
  item: 'text-xs leading-4 font-normal',
};
