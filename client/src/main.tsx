import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import './styles/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0B1B3A',
            color: '#FBF7F0',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '14px',
            padding: '12px 16px',
            fontFamily: 'Manrope, system-ui, sans-serif',
          },
          success: { iconTheme: { primary: '#D4AF37', secondary: '#0B1B3A' } },
          error: { iconTheme: { primary: '#E5484D', secondary: '#FBF7F0' } },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
