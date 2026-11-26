import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';
import { NavigationProgressBar } from '@/components/navigation-progress';
import { TelemetryMonitor } from '@/components/telemetry-monitor';

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});
const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hotel Operations ERP — Luxury & Boutique PMS',
  description: 'Enterprise hotel operations, Indian GST invoicing, tape chart, and front-desk PMS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-ground font-sans text-ink antialiased selection:bg-teal-500/20">
        <Suspense fallback={null}>
          <NavigationProgressBar />
          <TelemetryMonitor />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
