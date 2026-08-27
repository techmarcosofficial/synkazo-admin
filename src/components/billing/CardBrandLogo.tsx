import { CreditCard } from 'lucide-react';

import { cn } from '@/lib/utils';

// Simplified brand marks (not the trademarked logos) — enough to read at a glance
// which card brand a row is, in each brand's recognizable color scheme.
function VisaMark() {
  return (
    <svg
      viewBox="0 0 48 32"
      className="h-full w-full"
      role="img"
      aria-label="Visa"
    >
      <rect width="48" height="32" fill="#1A1F71" />
      <text
        x="24"
        y="21"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fontStyle="italic"
        fontFamily="Arial, sans-serif"
        fill="#ffffff"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg
      viewBox="0 0 48 32"
      className="h-full w-full"
      role="img"
      aria-label="Mastercard"
    >
      <rect width="48" height="32" fill="#ffffff" />
      <circle cx="20" cy="16" r="9" fill="#EB001B" />
      <circle cx="28" cy="16" r="9" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  );
}

function AmexMark() {
  return (
    <svg
      viewBox="0 0 48 32"
      className="h-full w-full"
      role="img"
      aria-label="American Express"
    >
      <rect width="48" height="32" fill="#006FCF" />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill="#ffffff"
      >
        AMEX
      </text>
    </svg>
  );
}

function DiscoverMark() {
  return (
    <svg
      viewBox="0 0 48 32"
      className="h-full w-full"
      role="img"
      aria-label="Discover"
    >
      <rect width="48" height="32" fill="#F58220" />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        fill="#ffffff"
      >
        DISCOVER
      </text>
    </svg>
  );
}

// Stripe's `card.brand` values (lowercase, snake_case for the multi-word ones).
const BRAND_MARKS: Record<string, () => React.JSX.Element> = {
  visa: VisaMark,
  mastercard: MastercardMark,
  amex: AmexMark,
  american_express: AmexMark,
  discover: DiscoverMark,
};

interface CardBrandLogoProps {
  brand: string | null | undefined;
  className?: string;
}

/** Small rounded chip showing a saved card's brand mark, or a generic card icon
 *  for brands we don't have a mark for (diners/jcb/unionpay/unknown/null). */
export default function CardBrandLogo({
  brand,
  className,
}: CardBrandLogoProps) {
  const Mark = brand ? BRAND_MARKS[brand.toLowerCase()] : undefined;

  return (
    <div
      className={cn(
        'border-border/60 flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border',
        className,
      )}
    >
      {Mark ? (
        <Mark />
      ) : (
        <CreditCard className="text-muted-foreground h-4 w-4" />
      )}
    </div>
  );
}
