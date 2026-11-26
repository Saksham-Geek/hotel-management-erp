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
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}document.documentElement.setAttribute('data-theme','bundled');var ch=localStorage.getItem('pms_custom_accent_hex');if(ch&&ch.startsWith('#')){var c=ch.replace('#','');if(c.length===3)c=c.split('').map(function(x){return x+x;}).join('');if(c.length===6){var r=parseInt(c.substring(0,2),16)/255,g=parseInt(c.substring(2,4),16)/255,b=parseInt(c.substring(4,6),16)/255;var max=Math.max(r,g,b),min=Math.min(r,g,b);var h=0,s=0,l=(max+min)/2;if(max!==min){var delta=max-min;s=l>0.5?delta/(2-max-min):delta/(max+min);switch(max){case r:h=(g-b)/delta+(g<b?6:0);break;case g:h=(b-r)/delta+2;break;case b:h=(r-g)/delta+4;break;}h=Math.round(h*60);}var customHsl=h+' '+Math.round(s*100)+'% '+Math.round(l*100)+'%';document.documentElement.style.setProperty('--primary',customHsl);document.documentElement.style.setProperty('--ring',customHsl);document.documentElement.style.setProperty('--accent',customHsl);document.documentElement.style.setProperty('--primary-foreground','0 0% 100%');return;}}var ac=localStorage.getItem('pms_accent_color');var m={'crimson':['348 83% 47%','348 86% 56%'],'coral':['21 90% 48%','21 95% 58%'],'amber':['38 92% 50%','38 95% 58%'],'emerald':['160 84% 39%','160 84% 48%'],'teal':['174 84% 32%','174 84% 42%'],'ocean':['201 96% 41%','201 96% 52%'],'indigo':['243 75% 59%','243 85% 68%'],'violet':['262 83% 58%','262 88% 66%'],'ruby':['349 89% 50%','349 92% 60%'],'pink':['330 81% 50%','330 85% 60%'],'charcoal':['240 5% 34%','240 5% 55%']};if(ac&&m[ac]){var hsl=d?m[ac][1]:m[ac][0];document.documentElement.style.setProperty('--primary',hsl);document.documentElement.style.setProperty('--ring',hsl);document.documentElement.style.setProperty('--accent',hsl);document.documentElement.style.setProperty('--primary-foreground','0 0% 100%');}}catch(e){}})();`,
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
