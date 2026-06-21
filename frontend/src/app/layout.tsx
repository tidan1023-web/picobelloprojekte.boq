import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Warehouse Inventory HQ',
  description: 'Medical hardware inventory management and delivery accountability',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
