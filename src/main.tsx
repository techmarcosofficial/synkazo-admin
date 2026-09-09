import { LucideProvider } from 'lucide-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from '@/App';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

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
