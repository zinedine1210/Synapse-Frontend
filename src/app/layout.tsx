import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { brand } from '@/config/brand';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { ToastProvider } from '@/components/ui';
import { ConfirmProvider } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { EveningRecapToast } from '@/components/shared/EveningRecapToast';
import { CelebrationProvider } from '@/components/shared/CelebrationOverlay';

export const viewport: Viewport = {
  themeColor: '#00D4FF',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    template: `%s | ${brand.name}`,
    default: `${brand.name} – ${brand.tagline}`,
  },
  description: brand.description,
  keywords: ['akademik', 'mahasiswa', 'AI', 'kuis', 'rangkuman', 'belajar'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: brand.name,
  },
  openGraph: {
    type: 'website',
    title: brand.name,
    description: brand.description,
    url: brand.contact.website,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <CelebrationProvider>
                    {children}
                    <PWAInstallPrompt />
                    <EveningRecapToast />
                  </CelebrationProvider>
                </ConfirmProvider>
              </ToastProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
