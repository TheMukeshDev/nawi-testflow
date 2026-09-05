import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const SITE_URL = 'https://nawi-sahayak.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'NAWI Sahayak — OIML R-76 Test Report System',
  description: 'Digital testing, calculation and report management for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R-76.',
  applicationName: 'NAWI Sahayak',
  authors: [{ name: 'TheMukeshDev', url: 'https://github.com/TheMukeshDev' }],
  keywords: ['NAWI', 'OIML R-76', 'weighing instruments', 'test reports', 'metrology', 'compliance'],
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'NAWI Sahayak',
    title: 'NAWI Sahayak — OIML R-76 Test Report System',
    description: 'Digital testing, calculation and report management for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R-76.',
    images: [{ url: `${SITE_URL}/og-image.svg`, width: 1200, height: 630, alt: 'NAWI Sahayak' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NAWI Sahayak — OIML R-76 Test Report System',
    description: 'Digital testing, calculation and report management for NAWI as per OIML Recommendation R-76.',
    images: [`${SITE_URL}/og-image.svg`],
  },
  icons: {
    icon: '/logo/nawi-logo.svg',
    shortcut: '/logo/nawi-logo.svg',
    apple: '/logo/nawi-logo.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
