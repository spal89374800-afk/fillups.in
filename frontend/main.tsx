import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import PublicServicePage from './components/PublicServicePage.tsx';
import PublicServicesIndexPage from './components/PublicServicesIndexPage.tsx';
import type { PublicService } from './services/publicCatalogApi';
import './index.css';

const root = createRoot(document.getElementById('root')!);
const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
const serviceMatch = pathname.match(/^\/(?:(en|hi)\/)?services\/([^/]+)$/);
const indexMatch = pathname.match(/^\/(?:(en|hi)\/)?services$/);
const lang = serviceMatch?.[1] === 'hi' || indexMatch?.[1] === 'hi' ? 'hi' : 'en';

if (serviceMatch) {
  const slug = decodeURIComponent(serviceMatch[2]);
  const boot = (window as unknown as { __PUBLIC_SERVICE__?: PublicService }).__PUBLIC_SERVICE__;
  root.render(
    <PublicServicePage
      slug={slug}
      lang={lang}
      initialService={boot && boot.slug === slug ? boot : null}
    />
  );
} else if (indexMatch) {
  const boot = (window as unknown as { __PUBLIC_SERVICES__?: PublicService[] }).__PUBLIC_SERVICES__;
  root.render(
    <PublicServicesIndexPage
      lang={lang}
      initialServices={Array.isArray(boot) && boot.length > 0 ? boot : null}
    />
  );
} else {
  root.render(<App />);
}
