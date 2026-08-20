import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import { LandingPage } from './pages/LandingPage';
import { FAQPage, BlogPage, PrivacyPage, TermsPage } from './pages/StaticPages';

const path = window.location.pathname.replace(/\/$/, '');

let Component = LandingPage;
if (path.endsWith('/faq')) {
  Component = FAQPage;
} else if (path.endsWith('/blog')) {
  Component = BlogPage;
} else if (path.endsWith('/privacy')) {
  Component = PrivacyPage;
} else if (path.endsWith('/terms')) {
  Component = TermsPage;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Component />
  </StrictMode>
);
