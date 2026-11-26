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
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}var ct=localStorage.getItem('pms_color_theme')||'obsidian';document.documentElement.setAttribute('data-theme',ct);var ac=localStorage.getItem('pms_accent_color');var m={'crimson':['348 83% 47%','348 86% 56%'],'ruby':['349 89% 50%','349 92% 60%'],'indigo':['243 75% 59%','243 85% 68%'],'violet':['262 83% 58%','262 88% 66%'],'emerald':['160 84% 39%','160 84% 48%'],'amber':['38 92% 50%','38 95% 58%'],'ocean':['201 96% 41%','201 96% 52%'],'coral':['21 90% 48%','21 95% 58%']};if(ac&&m[ac]){var hsl=d?m[ac][1]:m[ac][0];document.documentElement.style.setProperty('--primary',hsl);document.documentElement.style.setProperty('--ring',hsl);document.documentElement.style.setProperty('--accent',hsl);document.documentElement.style.setProperty('--primary-foreground','0 0% 100%');}}catch(e){}})();`,
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
