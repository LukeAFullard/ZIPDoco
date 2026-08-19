import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupStorageCleanupHooks } from './lib/storage/opfs'

// Initialize OPFS storage garbage collector hooks (purges 24h stale sessions on app boot and unload)
setupStorageCleanupHooks(() => null);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
