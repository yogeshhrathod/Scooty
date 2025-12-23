import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AptabaseProvider } from '@aptabase/react';
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AptabaseProvider appKey={import.meta.env.VITE_APTABASE_APP_KEY}>
      <App />
    </AptabaseProvider>
  </StrictMode>,
)
