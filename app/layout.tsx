import type { Metadata, Viewport } from 'next';
import { Dancing_Script, Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CommandPalette } from '@/components/layout/command-palette';
import { ChatbotLauncher } from '@/components/chatbot/launcher';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const deva = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '500', '600', '700'], variable: '--font-deva', display: 'swap' });
/** Display script used for decorative headings (gallery showcase, page-hero accents). */
const script = Dancing_Script({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-script', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://polarverse.demo'),
  title: { default: 'PolarVerse · NCPOR (Demo)', template: '%s · PolarVerse (Demo)' },
  description:
    'Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal — a frontend demo for NCPOR, Ministry of Earth Sciences. All data is fictional.',
  openGraph: {
    title: 'PolarVerse · NCPOR (Demo)',
    description: 'Explore India’s Antarctic, Arctic, Himalayan and ocean science — reports, datasets, media and learning.',
    type: 'website',
    siteName: 'PolarVerse',
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5FAFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1F3A' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-textsize="md">
      <body className={`${inter.variable} ${deva.variable} ${script.variable} min-h-screen font-sans`}>
        <a
          href="#main"
          className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
            <SiteFooter />
          </div>
          <CommandPalette />
          <ChatbotLauncher />
        </Providers>
      </body>
    </html>
  );
}
