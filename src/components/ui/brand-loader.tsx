import { SynkazoWordmark } from '@/components/branding/SynkazoMark';
import { cn } from '@/lib/utils';

/** Compact Synkazo loader for buttons and other inline loading states. */
function ActionLoader({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      data-slot="spinner"
      viewBox="0 0 20 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin text-[#ff6b39]', className)}
      {...props}
    >
      <path
        d="M20 5.73346C20 6.55951 19.3527 7.22915 18.5542 7.22915H8.91566C6.58675 7.22915 4.6988 9.18227 4.6988 11.5916C4.6988 14.0009 6.58675 15.954 8.91566 15.954H7.71084C3.45226 15.954 0 12.3826 0 7.97699C0 3.57142 3.45226 0 7.71084 0H18.5542C19.3527 0 20 0.669641 20 1.49569V5.73346Z"
        fill="currentColor"
      />
      <path
        d="M0 20.2665C0 19.4405 0.647299 18.7709 1.44578 18.7709H11.0843C13.4132 18.7709 15.3012 16.8177 15.3012 14.4084C15.3012 11.9991 13.4132 10.046 11.0843 10.046H12.2892C16.5477 10.046 20 13.6174 20 18.023C20 22.4286 16.5477 26 12.2892 26H1.44578C0.647299 26 0 25.3304 0 24.5043V20.2665Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface PageLoaderProps extends React.ComponentProps<'div'> {
  label?: string;
}

/** Full-screen wordmark loader. Mount it only while the page is loading. */
function PageLoader({
  className,
  label = 'Loading Synkazo',
  ...props
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        'bg-background fixed inset-0 z-[60] flex min-h-screen items-center justify-center',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
      {...props}
    >
      <SynkazoWordmark
        className="text-foreground h-auto w-44 sm:w-52"
        tone="auto"
        animated
      />
    </div>
  );
}

export { ActionLoader, PageLoader };
