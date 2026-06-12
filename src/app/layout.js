import { Geist } from 'next/font/google';
import './globals.css';
import SidebarNav from '@/components/SidebarNav';
import AuthGuard from '@/components/AuthGuard';
import { StoreProvider } from '@/lib/store';

const geist = Geist({ subsets: ['latin'] });

export const metadata = {
  title: "Jan's Motorbike",
  description: 'Quản lý cho thuê xe máy',
  manifest: '/manifest.json'
};

export const viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('jans_theme') || 'dark';
                document.documentElement.className = stored;
              })();
              
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SW registered: ', registration.scope);
                  }, function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={geist.className} style={{ margin: 0 }}>
        <StoreProvider>
          <AuthGuard>
            <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
              <SidebarNav />
              <main id="main-content" className="flex-1 min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-[margin-left] duration-150 ease-in-out w-full md:w-auto">
                {children}
              </main>
            </div>
          </AuthGuard>
        </StoreProvider>
      </body>
    </html>
  );
}