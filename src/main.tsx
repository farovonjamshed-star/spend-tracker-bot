import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe initialization for Telegram Web App SDK & WebSocket status handling
if (typeof window !== 'undefined') {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready?.();
      tg.expand?.();
    }
  } catch (err) {
    // Graceful fallback outside Telegram WebApp environment
  }

  // Gracefully handle Vite HMR WebSocket closed messages in sandboxed/proxy environments
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('[vite] WebSocket') ||
        args[0].includes('WebSocket closed') ||
        args[0].includes('failed to connect to websocket'))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

