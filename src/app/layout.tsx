import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CreatorMobileNav from '@/components/CreatorMobileNav';
import { ToastProvider } from '@/components/ToastProvider';
import { UploadProvider } from '@/components/UploadProvider';
import AdminChatDrawer from '@/components/AdminChatDrawer';
import ScrollReveal from '@/components/ScrollReveal';
import { BRAND_NAME, PUBLIC_URL } from '@/lib/constants';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || PUBLIC_URL || 'https://pages.pinkroom.online';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDF0F5' },
    { media: '(prefers-color-scheme: dark)', color: '#141417' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'The Pink Room — Page Turning | Premium Faceless ASMR Creator Platform',
    template: '%s | The Pink Room',
  },
  description:
    'Turn pages. Create calming ASMR. Earn $50 per approved video. Record original, faceless page-turning ASMR videos lasting at least 3 minutes. Request a payout once 8 videos are approved ($400).',
  keywords: [
    'The Pink Room',
    'Faceless ASMR',
    'Page Turning ASMR',
    'The Pink Room',
    'Audio creator studio',
    'Creator payouts',
    'Book sounds ASMR',
  ],
  authors: [{ name: 'The Pink Room', url: BASE_URL }],
  creator: 'The Pink Room',
  publisher: 'The Pink Room',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    title: 'The Pink Room — Page Turning ASMR Studio',
    description:
      'Record faceless page-turning ASMR and earn $50 per approved video. Reliable direct payouts upon 8 approved videos ($400).',
    siteName: 'The Pink Room',
    images: [
      {
        url: '/the-pink-room-logo.png',
        width: 1200,
        height: 630,
        alt: 'The Pink Room — Page Turning ASMR',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Pink Room — Page Turning ASMR Studio',
    description:
      'Record faceless page-turning ASMR and earn $50 per approved video with reliable direct payouts.',
    images: ['/the-pink-room-logo.png'],
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/the-pink-room-logo.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Buda:wght@300&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-ivory-100 dark:bg-[#141417] text-charcoal-800 dark:text-[#D2D2DE] antialiased selection:bg-plum-100 selection:text-plum-900 transition-colors duration-150">
        <ScrollReveal />
        <ToastProvider>
          <UploadProvider>
            <Navbar />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer />
            <CreatorMobileNav />
            <AdminChatDrawer />
          </UploadProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
