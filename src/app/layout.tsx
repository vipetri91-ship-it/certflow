import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// Usada só em números grandes/KPIs, valores monetários, medidor e ranking
// (ver docs do redesign "Aurora/Midnight") — Inter continua em todo o resto.
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title:       { default: 'CertFlow', template: '%s | CertFlow' },
  description: 'Sistema de Gestão de Certificados Digitais — V&G Certificado Digital',
  manifest:    '/manifest.webmanifest',
  appleWebApp: {
    capable:       true,
    statusBarStyle: 'black-translucent',
    title:         'CertFlow',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor:          '#2563eb',
  width:               'device-width',
  initialScale:        1,
  maximumScale:        1,
  userScalable:        false,
  viewportFit:         'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Previne flash de tema errado */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('certflow-theme');var p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&p)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
        {/* Registra o Service Worker para PWA */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`}} />
      </head>
      <body className="h-full font-sans">{children}</body>
    </html>
  )
}