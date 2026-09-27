import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';

import { ThemeBoot } from '@/components/ThemeBoot';
import { NavigationProgressBar } from '@/components/ui/NavigationProgressBar';

export const metadata: Metadata = {
  title: {
    default: 'ERPFY',
    template: '%s · ERPFY',
  },
  description: 'A multi-tenant ERP platform.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <ThemeBoot />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
