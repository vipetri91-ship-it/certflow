import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'CertFlow — V&G Certificado Digital',
    short_name:       'CertFlow',
    description:      'Sistema de Gestão de Certificados Digitais',
    start_url:        '/dashboard',
    display:          'standalone',
    background_color: '#0f172a',
    theme_color:      '#2563eb',
    orientation:      'portrait-primary',
    categories:       ['business', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any',     type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icon',     sizes: '512x512', type: 'image/png',     purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}