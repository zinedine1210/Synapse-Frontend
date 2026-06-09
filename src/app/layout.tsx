import type { Metadata } from 'next';
import '@/styles/globals.css';
import { brand } from '@/config/brand';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { ToastProvider } from '@/components/ui';
import { ConfirmProvider } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: {
    template: `%s | ${brand.name}`,
    default: `${brand.name} – ${brand.tagline}`,
  },
  description: brand.description,
  keywords: ['akademik', 'mahasiswa', 'AI', 'kuis', 'rangkuman', 'belajar'],
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
      <body>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>
              <ToastProvider>
                <ConfirmProvider>
                  {children}
                </ConfirmProvider>
              </ToastProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
