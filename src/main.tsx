import { LucideProvider } from 'lucide-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from '@/App';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

// An open tab can still reference chunks from the previous deployment. Vite
// emits this event when a dynamic import fails; reload once to get the latest
// index.html and its matching asset URLs.
window.addEventListener('vite:preloadError', (event) => {
  const retryKey = 'synkazo:chunk-reload-at';
  const lastRetry = Number(sessionStorage.getItem(retryKey) ?? 0);

  if (Date.now() - lastRetry < 30_000) return;

  event.preventDefault();
  sessionStorage.setItem(retryKey, String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LucideProvider strokeWidth={2.5}>
      <ThemeProvider storageKey="sb-theme-v2" defaultTheme="light">
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </LucideProvider>
  </StrictMode>,
);
