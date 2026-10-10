import { Buffer } from 'buffer';

// Ensure Buffer and global are available in browser environments
if (typeof window !== 'undefined') {
  (window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
  (window as unknown as { global: typeof window }).global = window;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { validateEnvironmentConfig } from './config/magicblock';

// Validate required environment configuration on startup
const envCheck = validateEnvironmentConfig();
if (!envCheck.isValid) {
  console.error('Environment configuration error:', envCheck.errors);
}

createRoot(document.getElementById('root')!).render(<App />);

