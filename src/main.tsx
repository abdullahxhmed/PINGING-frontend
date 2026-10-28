import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './app/App'
import { preloadStoreCatalog } from './features/store/useStoreCatalog'

// Preload storefront slot data right on page load and cache until a page refresh
preloadStoreCatalog();

// Ensure fresh Kauntact favicon and title in all browser environments
if (typeof document !== 'undefined') {
  if (!document.title || document.title.toLowerCase().includes('findat')) {
    document.title = 'Kauntact - Private Contact Layer';
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
