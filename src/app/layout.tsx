import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'CertFlow', template: '%s | CertFlow' },
  description: 'Sistema de Gestão de Certificados Digitais',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-gray-50 font-sans">{children}</body>
    </html>
  )
}
